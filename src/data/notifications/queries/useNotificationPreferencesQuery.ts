import { useQuery } from '@tanstack/react-query';
import { fetchNotificationPreferences } from './fetchNotificationPreferences';

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notification-preferences'] as const;

export const useNotificationPreferencesQuery = (userId: string | null) => {
  return useQuery({
    queryKey: [...NOTIFICATION_PREFERENCES_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return fetchNotificationPreferences(userId);
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};