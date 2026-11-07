import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { useWellnessReminderQuery, wellnessReminderKey } from './queries/useWellnessReminderQuery';
import { notificationError, saveWellnessReminder } from '@/data/notifications/api';

export function useWellnessReminderData() {
  const { user, relationshipIdentity } = useAuth(); const accountId = user?.id ?? null;
  const currentAccount = useRef(accountId); const accountGeneration = useRef(0);
  if (currentAccount.current !== accountId) { currentAccount.current = accountId; accountGeneration.current++; }
  type SaveScope = { accountId: string; generation: number };
  const pending = useRef<SaveScope | null>(null);
  const [saving, setSaving] = useState<SaveScope | null>(null);
  const [failure, setFailure] = useState<(SaveScope & { message: string }) | null>(null);
  const queryClient = useQueryClient(); const query = useWellnessReminderQuery(accountId);
  const reminder = query.data?.user_id === accountId ? query.data : null;
  const isSaving = !!accountId && saving?.accountId === accountId && saving.generation === accountGeneration.current;
  const isReady = !!accountId && query.isSuccess && !query.isFetching && !isSaving;
  const saveReminder = useCallback(async (enabled: boolean, time: string): Promise<boolean> => {
    if (!accountId || currentAccount.current !== accountId || (pending.current?.accountId === accountId && pending.current.generation === accountGeneration.current) || !query.isSuccess || query.isFetching) return false;
    const generation = accountGeneration.current;
    const scope = { accountId, generation };
    pending.current = scope; setSaving(scope); setFailure(null);
    const controller = new AbortController();
    try {
      await queryClient.cancelQueries({ queryKey: wellnessReminderKey(accountId), exact: true });
      if (currentAccount.current !== accountId || accountGeneration.current !== generation) return false;
      const saved = await saveWellnessReminder(accountId, enabled, time, controller.signal);
      if (currentAccount.current !== accountId || accountGeneration.current !== generation) return false;
      queryClient.setQueryData(wellnessReminderKey(accountId), saved); return true;
    } catch (error) {
      if (currentAccount.current === accountId && accountGeneration.current === generation) setFailure({ accountId, generation, message: notificationError(error) });
      return false;
    } finally {
      controller.abort();
      if (pending.current === scope) pending.current = null;
      if (currentAccount.current === accountId && accountGeneration.current === generation) setSaving(null);
    }
  }, [accountId, queryClient, query.isSuccess, query.isFetching]);
  const reload = async () => {
    if (!accountId || isSaving) return;
    const generation = accountGeneration.current;
    const result = await query.refetch();
    if (currentAccount.current === accountId && accountGeneration.current === generation && !result.error) setFailure(null);
  };
  return { accountId, reminder, isReady, isLoading: !!accountId && (query.isPending || query.isFetching), isSaving,
    error: failure?.accountId === accountId && failure.generation === accountGeneration.current ? failure.message : query.error ? notificationError(query.error) : null,
    saveReminder, reload,
    getDisplayTime: () => reminder?.reminder_time.slice(0, 5) ?? '09:00',
    timezone: reminder?.timezone ?? (relationshipIdentity?.currentUserId === accountId ? relationshipIdentity.timezone : null) ?? null,
  };
}
