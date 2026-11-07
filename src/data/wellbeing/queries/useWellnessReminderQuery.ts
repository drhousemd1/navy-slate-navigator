import { useQuery } from '@tanstack/react-query';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { getWellnessReminder } from '@/data/notifications/api';

export const WELLNESS_REMINDER_QUERY_KEY = ['wellness-reminder'] as const;
export const wellnessReminderKey = (accountId: string | null) => [...WELLNESS_REMINDER_QUERY_KEY, supabaseBackendId, accountId] as const;
export const fetchWellnessReminder = getWellnessReminder;
export function useWellnessReminderQuery(accountId: string | null) {
  return useQuery({ queryKey: wellnessReminderKey(accountId),
    queryFn: ({ signal }) => { if (!accountId) throw new Error('NOTIFICATION_ACCOUNT_CHANGED'); return getWellnessReminder(accountId, signal); },
    enabled: !!accountId, retry: false, networkMode: 'always', staleTime: 0,
    refetchOnMount: 'always', refetchOnWindowFocus: true, refetchOnReconnect: true,
  });
}
