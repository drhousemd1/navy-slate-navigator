import { useQuery } from "@tanstack/react-query";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { NOTIFICATION_PREFERENCES_QUERY_KEY } from "../useNotificationPreferencesData";

export function useNotificationPreferencesQuery() {
  const { user } = useAuth();

  return useQuery<NotificationPreferences>({
    queryKey: [...NOTIFICATION_PREFERENCES_QUERY_KEY, user?.id],
    queryFn: (): NotificationPreferences => {
      // This should never be called since data is preloaded into cache
      throw new Error('Notification preferences should be preloaded into cache');
    },
    enabled: !!user?.id,
    ...STANDARD_QUERY_CONFIG, // Uses staleTime: Infinity, refetchOnMount: false
    placeholderData: DEFAULT_NOTIFICATION_PREFERENCES,
  });
}