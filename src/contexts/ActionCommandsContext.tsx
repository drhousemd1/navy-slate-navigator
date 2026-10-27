import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useUserIds } from './UserIdsContext';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { ActionCommandQueue } from '@/data/actions/queue';
import { IndexedDBActionQueueStore } from '@/data/actions/store';
import { createSupabaseActionTransport } from '@/data/actions/supabase-transport';
import { blocksNewAction, decodeActionScope, scopeKey, type ActionQueueScope, type QueueEntry, type ActionIntent } from '@/data/actions/contracts';
import { accountingStatusKey, readAccountingEnabled, readRewardActionData, rewardActionKey, type RewardActionData } from '@/data/rewards/actionReadModel';
import { TaskFeedback } from '@/components/task/TaskFeedback';
import { RewardFeedback } from '@/components/rewards/RewardFeedback';
import { fetchIdentity } from '@/data/identity';
import { withCurrentVerification } from '@/lib/offline/verified-transport';
import { clearRecoverySnapshot, projectRecoverySnapshot, saveRecoverySnapshot } from '@/lib/offline/recovery';

export type VisibleCommand = QueueEntry & { canReplay: boolean; canCancel: boolean; canReconcile: boolean };
interface ActionCommandsValue {
  scope: ActionQueueScope | null;
  mode: 'loading' | 'error' | 'legacy' | 'atomic';
  data: RewardActionData | null;
  error: string | null;
  entries: VisibleCommand[];
  confirmed: QueueEntry[];
  enqueue(intent: ActionIntent): Promise<void>;
  retry(id: string): Promise<void>;
  cancelUnsent(id: string): Promise<void>;
  reconcile(id: string): Promise<'confirmed' | 'not_found'>;
  refresh(): Promise<void>;
}
const ActionCommandsContext = createContext<ActionCommandsValue | null>(null);

export function ActionCommandsProvider({ children }: React.PropsWithChildren) {
  const identity = useUserIds();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scope = useMemo<ActionQueueScope | null>(() => identity.canAccessData && !identity.isLoadingUserIds &&
    user?.id && user.id === identity.currentUserId && identity.relationshipId && identity.relationshipSessionId && identity.participantId && identity.relationshipStatus === 'active'
    ? { backendId: supabaseBackendId, accountId: user.id, participantId: identity.participantId, relationshipId: identity.relationshipId, relationshipSessionId: identity.relationshipSessionId } : null,
  [identity.canAccessData, identity.isLoadingUserIds, identity.currentUserId, identity.relationshipId, identity.relationshipSessionId, identity.participantId, identity.relationshipStatus, user?.id]);
  const currentScope = useRef(scope); currentScope.current = scope;
  const [queue, setQueue] = useState<ActionCommandQueue | null>(null);
  const [listed, setListed] = useState<{ key: string; rows: VisibleCommand[] } | null>(null);
  const [confirmed, setConfirmed] = useState<QueueEntry[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const savingIntent = useRef(false);
  const status = useQuery({ queryKey: accountingStatusKey(scope), enabled: !!scope,
    queryFn: ({ signal }) => readAccountingEnabled(scope!, signal), retry: false, networkMode: 'always',
    staleTime: 0, refetchOnMount: 'always', refetchInterval: 10_000 });
  // A same-scope refresh failure cannot erase a previously verified gate.
  // This permits durable offline intent; the server rechecks it on replay.
  // No initial/unknown/error response ever selects the legacy writer path.
  const atomic = !!scope && status.data === true;
  const readModel = useQuery({ queryKey: rewardActionKey(scope), enabled: atomic,
    queryFn: ({ signal }) => readRewardActionData(scope!, signal), retry: false,
    staleTime: 0, refetchOnMount: 'always', refetchInterval: 10_000 });

  useEffect(() => {
    if (scope && status.data === false) clearRecoverySnapshot(scope.backendId);
    if (scope && atomic && status.isSuccess && readModel.isSuccess && readModel.data) {
      let saved = false;
      try { saved = saveRecoverySnapshot(projectRecoverySnapshot(scope, readModel.data, readModel.dataUpdatedAt)); } catch { /* A bad projection cannot crash the live application. */ }
      if (!saved) {
        setStorageError('The last confirmed summary could not be saved for offline recovery. Saved actions use their separate durable store.');
      }
    }
  }, [scope, atomic, status.data, status.isSuccess, readModel.data, readModel.dataUpdatedAt, readModel.isSuccess]);

  useEffect(() => {
    const store = new IndexedDBActionQueueStore();
    const transport = withCurrentVerification(createSupabaseActionTransport(), {
      identity: fetchIdentity, accounting: readAccountingEnabled,
      isCurrent: expected => !!currentScope.current && scopeKey(expected) === scopeKey(currentScope.current),
    });
    const instance = new ActionCommandQueue({ store, transport,
      onStorageError: error => setStorageError(error.message),
      onObserverError: () => setStorageError('The action was recorded, but its display could not refresh. Reload confirmed data.'),
      onConfirmed: entry => {
        if (!currentScope.current || scopeKey(currentScope.current) !== scopeKey(entry.scope)) return;
        setConfirmed(previous => [...previous.filter(item => item.command.commandId !== entry.command.commandId), entry]);
        // Receipts describe a past instant. Always read current balances again.
        void queryClient.invalidateQueries({ queryKey: rewardActionKey(decodeActionScope(entry.scope)), exact: true });
        void queryClient.invalidateQueries({ queryKey: ['task-action-state'] });
        void queryClient.invalidateQueries({ queryKey: ['recording-action-state'] });
        void queryClient.invalidateQueries({ queryKey: ['activity-metrics'] });
        void queryClient.invalidateQueries({ queryKey: ['profile'] });
      },
    });
    setQueue(instance);
    return () => { instance.setContext(null); instance.dispose(); void store.close().catch(() => {}); };
  }, [queryClient]);

  useLayoutEffect(() => { queue?.setContext(atomic ? scope : null); }, [queue, atomic, scope]);
  useEffect(() => {
    if (!queue) return;
    let active = true;
    const load = async () => {
      const expected = currentScope.current;
      if (!expected) { setListed(null); return; }
      try {
        const rows = await queue.list();
        if (active && currentScope.current && scopeKey(expected) === scopeKey(currentScope.current)) setListed({ key: scopeKey(expected), rows });
      } catch (error) { if (active) setStorageError(error instanceof Error ? error.message : 'Saved actions could not be loaded.'); }
    };
    const stop = queue.subscribe(() => void load());
    const refreshVisible = () => { if (document.visibilityState !== 'hidden') void load(); };
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    void load();
    return () => { active = false; stop(); window.removeEventListener('focus', refreshVisible); document.removeEventListener('visibilitychange', refreshVisible); };
  }, [queue, scope, atomic]);
  const entries = scope && listed?.key === scopeKey(scope) ? listed.rows : [];
  const visibleConfirmed = scope ? confirmed.filter(entry => scopeKey(entry.scope) === scopeKey(scope)) : [];
  const enqueue = useCallback(async (intent: ActionIntent) => {
    if (!queue || !atomic || !scope || currentScope.current !== scope) throw new Error('Load your current action account before taking an action.');
    if (savingIntent.current) throw new Error('This action is already being saved.');
    savingIntent.current = true;
    try {
      const saved = await queue.list();
      if (saved.some(entry => blocksNewAction(entry, scope))) throw new Error('Resolve the pending action before starting another.');
      if (currentScope.current !== scope) throw new Error('Your account or relationship changed.');
      await queue.enqueue(intent);
    } finally { savingIntent.current = false; }
  }, [queue, atomic, scope, entries]);
  const refresh = useCallback(async () => {
    setStorageError(null);
    await queryClient.invalidateQueries({ queryKey: accountingStatusKey(scope), exact: true });
    if (atomic) await Promise.all([
      queryClient.invalidateQueries({ queryKey: rewardActionKey(scope), exact: true }),
      queryClient.invalidateQueries({ queryKey: ['task-action-state'] }),
      queryClient.invalidateQueries({ queryKey: ['recording-action-state'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-metrics'] }),
    ]);
  }, [queryClient, scope, atomic]);
  const mode = !scope ? 'loading' : status.data === true ? 'atomic' : status.data === false ? 'legacy' : status.isError ? 'error' : 'loading';
  const value: ActionCommandsValue = { scope, mode, data: atomic ? readModel.data ?? null : null,
    error: storageError ?? (status.error?.message || readModel.error?.message || null), entries, confirmed: visibleConfirmed,
    enqueue, refresh,
    retry: async id => { if (!queue || !atomic) throw new Error('Current action account is unavailable.'); await queue.retry(id); },
    reconcile: async id => { if (!queue || !atomic) throw new Error('Load your current action account before checking old receipts.'); return queue.reconcile(id); },
    cancelUnsent: async id => { if (!queue || !atomic || !await queue.cancelUnsent(id)) throw new Error('This action may already have been sent and cannot be cancelled.'); },
  };
  return <ActionCommandsContext.Provider value={value}>{children}<div className="action-feedback-stack"><RewardFeedback /><TaskFeedback /></div></ActionCommandsContext.Provider>;
}
export function useActionCommands() {
  const value = useContext(ActionCommandsContext);
  if (!value) throw new Error('Action commands require ActionCommandsProvider.');
  return value;
}
