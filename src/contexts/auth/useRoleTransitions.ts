import { useEffect, useRef, useState } from 'react';
import { supabaseBackendId } from '@/integrations/supabase/client';
import type { IdentityState } from '@/lib/identity';
import type { ProfileRole } from '@/types/profile';
import { roleTransport, roleErrorText, roleRequestRejected, type RoleTransport } from '@/data/roleTransitions/api';
import { roleStore, type RoleStore } from '@/data/roleTransitions/store';
import { decodeRoleReceipt, roleScopeKey, type RoleScope, type RoleOptions, type RoleRecord, type RoleReceipt } from '@/data/roleTransitions/types';

const dependencies = { transport: roleTransport, store: roleStore };
interface Owner { accountId: string | null }
interface Options { key: string; target: ProfileRole; data: RoleOptions | null; loading: boolean; error: string | null }
interface State { owner: Owner; record: RoleRecord | null; loading: boolean; storageReady: boolean; busy: boolean; error: string | null; options: Options | null }
const blank = (owner: Owner): State => ({ owner, record: null, loading: !!owner.accountId, storageReady: false, busy: false, error: null, options: null });
export function useRoleTransitions(accountId: string | null, identity: IdentityState, refreshIdentity: () => Promise<IdentityState | null>,
  deps: { transport: RoleTransport; store: RoleStore } = dependencies) {
  const currentOwner = useRef<Owner>({ accountId });
  const operation = useRef<AbortController | null>(null); const optionRead = useRef<AbortController | null>(null);
  if (currentOwner.current.accountId !== accountId) {
    operation.current?.abort(); optionRead.current?.abort(); operation.current = null; optionRead.current = null;
    currentOwner.current = { accountId };
  }
  const owner = currentOwner.current; const mounted = useRef(true);
  const [stored, setState] = useState(() => blank(owner)); const state = stored.owner === owner ? stored : blank(owner);
  const latest = useRef({ identity, refreshIdentity, state }); latest.current = { identity, refreshIdentity, state };
  const scope: RoleScope | null = identity.currentUserId === accountId && identity.canAccessData && identity.status === 'unlinked' && identity.relationshipId && identity.relationshipSessionId
    ? { backendId: supabaseBackendId, accountId, relationshipId: identity.relationshipId, relationshipSessionId: identity.relationshipSessionId } : null;
  const scopeIdentity = JSON.stringify([roleScopeKey(scope), identity.currentRole]);
  const view = useRef({ key: scopeIdentity, generation: 0 });
  if (view.current.key !== scopeIdentity) { optionRead.current?.abort(); optionRead.current = null; view.current = { key: scopeIdentity, generation: view.current.generation + 1 }; }
  const key = JSON.stringify([scopeIdentity, view.current.generation]);
  const currentView = view.current;
  const active = () => mounted.current && currentOwner.current === owner;
  const update = (patch: Partial<State>) => { if (active()) setState(previous => ({ ...(previous.owner === owner ? previous : blank(owner)), ...patch })); };
  const actualScope = () => {
    const value = latest.current.identity;
    return value.canAccessData && value.status === 'unlinked' && value.currentUserId === accountId && value.relationshipId && value.relationshipSessionId
      ? { backendId: supabaseBackendId, accountId, relationshipId: value.relationshipId, relationshipSessionId: value.relationshipSessionId } : null;
  };
  const finish = async (record: RoleRecord, receipt: RoleReceipt, controller: AbortController) => {
    decodeRoleReceipt(receipt, record.intent);
    if (!active() || controller.signal.aborted) return;
    const completed: RoleRecord = { ...record, status: 'completed', receipt, problem: null };
    // The receipt is saved before refreshing identity, which unmounts Profile.
    await deps.store.save(completed, record.intent.commandId);
    if (!active() || controller.signal.aborted) return;
    update({ record: completed, options: null });
    const next = await latest.current.refreshIdentity();
    if (!active() || controller.signal.aborted) return;
    if (!next?.canAccessData || next.currentUserId !== accountId) update({ error: 'The role change was recorded, but your current account could not be verified. Refresh your account before continuing.' });
  };
  const run = async (record: RoleRecord, send: boolean) => {
    if (!active() || operation.current) return;
    const controller = new AbortController(); operation.current = controller;
    update({ record, busy: true, error: null, options: null });
    try {
      const receipt = send ? await deps.transport.change(record.intent, controller.signal) : await deps.transport.result(record.intent, controller.signal);
      if (!active() || controller.signal.aborted) return;
      if (receipt) await finish(record, receipt, controller);
      else update({ error: 'No confirmation was found. The saved request has not been sent again.' });
    } catch (error) {
      if (!active() || controller.signal.aborted) return;
      if (send && roleRequestRejected(error)) {
        const rejected: RoleRecord = { ...record, status: 'rejected', receipt: null, problem: roleErrorText(error) };
        try { await deps.store.save(rejected, record.intent.commandId); if (active()) update({ record: rejected, error: rejected.problem }); }
        catch { update({ error: 'The rejection could not be saved. Keep this request and check its result before continuing.' }); }
      } else update({ error: roleErrorText(error) });
    } finally { if (operation.current === controller) operation.current = null; if (active()) update({ busy: false }); }
  };
  useEffect(() => {
    mounted.current = true; let valid = true;
    setState(blank(owner));
    if (accountId) void deps.store.read(supabaseBackendId, accountId).then(async record => {
      if (!valid || !active()) return;
      update({ record, loading: false, storageReady: true });
      if (record?.status === 'pending') await run(record, false);
    }).catch(() => { if (valid && active()) update({ loading: false, error: 'Saved role changes could not be read. Retry loading them before making a change.' }); });
    return () => { valid = false; mounted.current = false; operation.current?.abort(); optionRead.current?.abort(); operation.current = null; optionRead.current = null; };
    // Account ownership, not relationship refresh, owns durable recovery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, deps]);

  const loadOptions = async (target: ProfileRole) => {
    if (!active() || !scope || !state.storageReady || state.loading || state.record || operation.current) return;
    const controller = new AbortController(); optionRead.current?.abort(); optionRead.current = controller;
    update({ options: { key, target, data: null, loading: true, error: null }, error: null });
    try {
      const options = await deps.transport.options(scope, target, controller.signal);
      if (active() && view.current === currentView && !controller.signal.aborted) {
        if (options.current.role !== latest.current.identity.currentRole) throw new Error('INVALID_ROLE_RESPONSE');
        update({ options: { key, target, data: options, loading: false, error: null } });
      }
    } catch { if (active() && view.current === currentView && !controller.signal.aborted) update({ options: { key, target, data: null, loading: false, error: 'Role choices could not be verified. Refresh your account and review them again.' } }); }
    finally { if (optionRead.current === controller) optionRead.current = null; }
  };
  const confirm = async (mode: 'fresh' | 'resume', savedPeriodId: string | null) => {
    const options = state.options?.key === key ? state.options.data : null;
    if (!active() || !scope || !options || !state.storageReady || state.loading || state.record || operation.current || view.current !== currentView) return;
    const selected = options.saved.find(item => item.periodId === savedPeriodId);
    if (mode === 'fresh' && (options.role === options.current.role || savedPeriodId !== null) || mode === 'resume' && !selected) return;
    const record: RoleRecord = { version: 1, status: 'pending', receipt: null, problem: null, intent: { commandId: crypto.randomUUID(), scope: { ...scope },
      role: options.role, mode, savedPeriodId, currentReviewToken: options.currentReviewToken, destinationReviewToken: mode === 'resume' ? selected!.reviewToken : null } };
    // Reserve the UI synchronously while the atomic durable transaction commits.
    const saving = new AbortController(); operation.current = saving; update({ busy: true, error: null });
    try {
      await deps.store.save(record, null);
      if (!active()) return;
      update({ record, options: null });
      if (roleScopeKey(actualScope()) !== roleScopeKey(record.intent.scope)) { update({ busy: false, error: 'Your connection changed. Check this saved request; it has not been sent again.' }); return; }
      operation.current = null;
      await run(record, true);
    } catch { update({ busy: false, storageReady: false, error: 'The role change could not be saved safely. No new request was sent. Reload saved changes before trying again.' }); }
    finally { if (operation.current === saving) operation.current = null; }
  };
  const reload = async () => {
    if (!accountId || !active() || operation.current) return;
    update({ loading: true, error: null });
    try { const record = await deps.store.read(supabaseBackendId, accountId); if (!active()) return; update({ record, loading: false, storageReady: true }); if (record?.status === 'pending') await run(record, false); }
    catch { update({ loading: false, storageReady: false, error: 'Saved role changes could not be read. Retry loading them before making a change.' }); }
  };
  const dismiss = async () => {
    if (!state.record || state.record.status === 'pending' || state.busy || !active()) return;
    try {
      await deps.store.remove(state.record); if (!active()) return;
      update({ record: null, error: null, options: null });
      if (state.record.status === 'rejected') await latest.current.refreshIdentity();
    }
    catch { update({ error: 'The saved request changed or could not be cleared. Reload saved changes before continuing.' }); }
  };
  const receipt = state.record?.receipt;
  const receiptIsCurrent = !!receipt && identity.canAccessData && identity.currentUserId === receipt.accountId && identity.relationshipId === receipt.to.periodId &&
    identity.relationshipSessionId === receipt.to.sessionId && identity.currentRole === receipt.to.role;
  return { ...state, options: state.options?.key === key ? state.options : null, available: !!scope, receiptIsCurrent,
    canRetry: !!state.record && state.record.status === 'pending' && roleScopeKey(scope) === roleScopeKey(state.record.intent.scope),
    loadOptions, confirm, reload, dismiss,
    refreshAccount: async () => { if (active() && !operation.current) { update({ options: null }); await latest.current.refreshIdentity(); } },
    cancelReview: () => { optionRead.current?.abort(); optionRead.current = null; update({ options: null }); },
    check: () => state.record && state.record.status === 'pending' ? run(state.record, false) : Promise.resolve(),
    retry: () => state.record && state.record.status === 'pending' && roleScopeKey(actualScope()) === roleScopeKey(state.record.intent.scope) ? run(state.record, true) : Promise.resolve(),
  };
}
