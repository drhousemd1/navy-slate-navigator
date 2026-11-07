import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveWellnessReminder } from '@/data/notifications/api';
import { wellnessReminderKey } from '../queries/useWellnessReminderQuery';
import type { CreateWellnessReminderData } from '../types';

export function useCreateWellnessReminder(accountId: string | null) {
  const client = useQueryClient();
  return useMutation({ retry: false, networkMode: 'always', mutationFn: async (value: CreateWellnessReminderData) => {
    if (!accountId) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
    // The caller's legacy timezone field is intentionally not an authority.
    return saveWellnessReminder(accountId, value.enabled, value.reminder_time.slice(0, 5));
  }, onSuccess: saved => { client.setQueryData(wellnessReminderKey(accountId), saved); } });
}
