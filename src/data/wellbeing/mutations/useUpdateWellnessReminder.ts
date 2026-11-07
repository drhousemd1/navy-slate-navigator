import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getWellnessReminder, saveWellnessReminder } from '@/data/notifications/api';
import { wellnessReminderKey } from '../queries/useWellnessReminderQuery';
import type { UpdateWellnessReminderData } from '../types';

export function useUpdateWellnessReminder(accountId: string | null) {
  const client = useQueryClient();
  return useMutation({ retry: false, networkMode: 'always', mutationFn: async (value: { id: string } & UpdateWellnessReminderData) => {
    if (!accountId) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
    const saved = await getWellnessReminder(accountId);
    if (!saved || saved.id !== value.id) throw new Error('INVALID_REMINDER_RESPONSE');
    return saveWellnessReminder(accountId, value.enabled ?? saved.enabled, (value.reminder_time ?? saved.reminder_time).slice(0, 5));
  }, onSuccess: saved => { client.setQueryData(wellnessReminderKey(accountId), saved); } });
}
