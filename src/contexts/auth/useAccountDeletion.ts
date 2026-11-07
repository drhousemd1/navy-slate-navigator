import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { supabaseBackendId } from '@/integrations/supabase/client';
import type { IdentityState } from '@/lib/identity';
import { deletionTransport, DeletionError, deletionErrorText, prePreparationErrors, type DeletionTransport } from '@/data/accountDeletion/api';
import { deletionStore, type DeletionStore } from '@/data/accountDeletion/store';
import { decodeDeletionStatus, deletionScopeKey, makeDeletionRecord, type DeletionRecord, type DeletionScope } from '@/data/accountDeletion/types';
import { cleanupDeletedAccount } from '@/data/accountDeletion/cleanup';
import { queryClient } from '@/data/queryClient';

export const DELETION_FOREGROUND_WINDOW_MS = 120_000;
interface Dependencies { store: DeletionStore; transport: DeletionTransport; cleanup: (scope: Pick<DeletionScope, 'backendId' | 'accountId'>) => Promise<{ legacyPreserved: boolean }> }
const defaults: Dependencies = { store: deletionStore, transport: deletionTransport, cleanup: scope => cleanupDeletedAccount(scope, queryClient) };
export function useAccountDeletion(accountId: string | null, identity: IdentityState, endDeletedSession: (account: string) => Promise<void>, deps: Dependencies = defaults) {
  const [records, setRecords] = useState<DeletionRecord[]>([]);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [busyJob, setBusyJob] = useState<string | null>(null);
  const running = useRef<AbortController | null>(null);
  const mounted = useRef(true); const busy = useRef(false); const saved = useRef<DeletionRecord[]>([]);
  const latest = useRef({ accountId, identity, endDeletedSession, generation: 0 });
  if (latest.current.accountId !== accountId) { latest.current.generation++; running.current?.abort(new DeletionError('ACCOUNT_CHANGED')); }
  latest.current = { accountId, identity, endDeletedSession, generation: latest.current.generation };
  const activeScope = (): DeletionScope | null => {
    const { accountId: current, identity: value } = latest.current;
    return current && value.currentUserId === current && value.canAccessData && value.relationshipId && value.relationshipSessionId
      ? { backendId: supabaseBackendId, accountId: current, relationshipId: value.relationshipId, relationshipSessionId: value.relationshipSessionId } : null;
  };
  const update = (record: DeletionRecord, sync = false) => {
    saved.current = [...saved.current.filter(item => item.key !== record.key), record];
    if (mounted.current) { const change = () => setRecords(saved.current); if (sync) flushSync(change); else change(); }
  };
  const errorFor = (job: string, message: string | null) => { if (mounted.current) setErrors(current => { const next = { ...current }; if (message) next[job] = message; else delete next[job]; return next; }); };
  const persist = async (record: DeletionRecord, expectedJob: string | null, sync = false) => { await deps.store.save(record, expectedJob); update(record, sync); };
  const finish = async (record: DeletionRecord) => {
    if (!mounted.current || record.cleanupComplete || record.status?.state !== 'complete') return;
    // This synchronous boundary unmounts this account's editors/providers before
    // cleanup; a different signed-in account keeps its mounted application.
    update(record, true);
    try {
      const result = await deps.cleanup(record.scope);
      if (!mounted.current) return;
      await latest.current.endDeletedSession(record.scope.accountId);
      await persist({ ...record, scope: { ...record.scope, relationshipId: null, relationshipSessionId: null }, recoveryToken: null, cleanupComplete: true, legacyPreserved: result.legacyPreserved }, record.jobId);
    } catch {
      errorFor(record.jobId, 'Your account is deleted on the server, but this device’s cleanup is not confirmed. Retry device cleanup. The saved recovery information has been kept.');
    }
  };
  const run = async (input: DeletionRecord, operation: 'start' | 'status' | 'resume' | 'cleanup') => {
    if (busy.current || !mounted.current) return;
    const record = saved.current.find(value => value.jobId === input.jobId);
    if (!record || record.cleanupComplete || record.scope.backendId !== supabaseBackendId) return;
    if (operation !== 'cleanup' && Date.now() < record.nextCheckAt) return;
    if (operation === 'start' && (record.status || deletionScopeKey(activeScope()) !== deletionScopeKey(record.scope))) {
      errorFor(record.jobId, 'The account or connection has changed. Check this saved request’s status; it will not be submitted in a different connection.'); return;
    }
    if (operation === 'resume' && !record.status) { errorFor(record.jobId, 'Check this saved request’s status before continuing deletion.'); return; }
    busy.current = true; setBusyJob(record.jobId); errorFor(record.jobId, null);
    const controller = new AbortController(); running.current = controller;
    const timer = setTimeout(() => controller.abort(new DeletionError('FOREGROUND_WINDOW_ENDED')), DELETION_FOREGROUND_WINDOW_MS);
    let attempted = record; let prepared = !!record.status;
    const accept = async (value: unknown) => {
      const status = decodeDeletionStatus(value, record.jobId); prepared = true;
      attempted = { ...attempted, status, startRejected: null, nextCheckAt: Date.now() + status.retryAfterMs };
      // Preserve a response received before cancellation even if Auth disappeared.
      await persist(attempted, record.jobId);
      if (status.state === 'complete') await finish(attempted);
    };
    const continuePrepared = async () => {
      let steps = 0;
      while (attempted.status?.state === 'pending' && mounted.current && !controller.signal.aborted && steps++ < 100) {
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(wait); reject(controller.signal.reason); };
          const wait = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, Math.max(0, attempted.nextCheckAt - Date.now()));
          controller.signal.addEventListener('abort', abort, { once: true });
          if (controller.signal.aborted) abort();
        });
        if (!mounted.current || controller.signal.aborted) break;
        await accept(await deps.transport.resume(attempted, controller.signal));
      }
      if (attempted.status?.state === 'pending') errorFor(record.jobId, 'Deletion is unfinished. This foreground attempt has paused; continue the same saved request when ready.');
    };
    try {
      if (record.status?.state === 'complete') { await finish(record); return; }
      if (operation === 'cleanup') return;
      if (operation === 'start' && record.attempted && !record.startRejected) {
        try {
          await accept(await deps.transport.status(record, controller.signal));
        } catch (error) {
          // An unavailable lookup permits only an exact same-intent retry with
          // live Auth. A transport failure never becomes evidence of absence.
          if (prepared || !(error instanceof DeletionError) || error.code !== 'DELETION_UNAVAILABLE') throw error;
        }
        if (prepared) { await continuePrepared(); return; }
      }
      if (operation === 'start') {
        const generation = latest.current.generation;
        attempted = { ...record, attempted: true, startRejected: null };
        await persist(attempted, record.jobId, true);
        if (!mounted.current || controller.signal.aborted || generation !== latest.current.generation || deletionScopeKey(activeScope()) !== deletionScopeKey(record.scope)) throw new DeletionError('ACCOUNT_CHANGED');
      }
      await accept(await deps.transport[operation](attempted, controller.signal));
      // Only the explicit Delete/Continue gesture advances storage/account work.
      // A status check and a reload never begin a mutation loop.
      if (operation !== 'status') await continuePrepared();
    } catch (error) {
      if (operation === 'start' && !prepared && error instanceof DeletionError && prePreparationErrors.has(error.code)) {
        try { await persist({ ...attempted, startRejected: error.code }, record.jobId); } catch { /* Keep the earlier uncertain record. */ }
      }
      errorFor(record.jobId, error instanceof DeletionError && error.code === 'FOREGROUND_WINDOW_ENDED'
        ? 'This foreground attempt has paused. Deletion is not confirmed finished; continue the same saved request when ready.' : deletionErrorText(error));
    } finally { clearTimeout(timer); running.current = null; busy.current = false; if (mounted.current) setBusyJob(null); }
  };
  const reload = async () => {
    setLoading(true); setLoadError(null);
    try { const next = await deps.store.list(supabaseBackendId); if (mounted.current) { saved.current = next; setRecords(next); } }
    catch { if (mounted.current) setLoadError('Saved deletion recovery could not be read. Retry before using this device’s account data.'); }
    finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => { mounted.current = true; void reload(); return () => { mounted.current = false; running.current?.abort(new DeletionError('FOREGROUND_WINDOW_ENDED')); }; }, [deps.store]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recovery reads are explicit in the UI. Reload never repeats a destructive
  // request or assumes that missing Auth means the account was deleted.
  const start = async (): Promise<{ error: string | null }> => {
    const scope = activeScope(); const generation = latest.current.generation;
    if (!scope || loading || loadError || busy.current) return { error: 'Your current account connection could not be checked. Reload it before deleting.' };
    const existing = saved.current.find(value => value.scope.accountId === scope.accountId);
    if (existing) return { error: 'A saved deletion request already exists. Review that request before starting another.' };
    const record = makeDeletionRecord(scope);
    busy.current = true;
    try { await persist(record, null, true); }
    catch { return { error: 'Recovery information could not be saved on this device. No deletion request was sent.' }; }
    finally { busy.current = false; }
    if (!mounted.current || generation !== latest.current.generation || deletionScopeKey(activeScope()) !== deletionScopeKey(scope)) return { error: 'The account or connection changed. No deletion request was sent.' };
    await run(record, 'start'); return { error: null };
  };
  const dismiss = async (record: DeletionRecord) => {
    if (busy.current) return;
    try {
      await deps.store.remove(record); saved.current = saved.current.filter(value => value.jobId !== record.jobId);
      if (mounted.current) setRecords(saved.current);
    } catch { errorFor(record.jobId, 'This request cannot be removed while deletion or device cleanup is unconfirmed.'); }
  };
  return { records, loading, loadError, errors, busyJob, start, reload, run, dismiss,
    canStart: !!activeScope() && !loading && !loadError && !busyJob,
    canRetryStart: (record: DeletionRecord) => !record.status && deletionScopeKey(activeScope()) === deletionScopeKey(record.scope),
  };
}
export type AccountDeletion = ReturnType<typeof useAccountDeletion>;
