import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getWellnessReminder, saveWellnessReminder } from '@/data/notifications/api';
import { wellnessReminderKey } from '../queries/useWellnessReminderQuery';

/** Legacy remove callers now disable the personal schedule. No direct row delete. */
export function useDeleteWellnessReminder(accountId: string | null) {
  const client = useQueryClient();
  return useMutation({ retry: false, networkMode: 'always', mutationFn: async (reminderId: string) => {
    if (!accountId) throw new Error('NOTIFICATION_ACCOUNT_CHANGED');
    const saved = await getWellnessReminder(accountId);
    if (!saved || saved.id !== reminderId) throw new Error('INVALID_REMINDER_RESPONSE');
    return saveWellnessReminder(accountId, false, saved.reminder_time.slice(0, 5));
  }, onSuccess: saved => { client.setQueryData(wellnessReminderKey(accountId), saved); } });
}
