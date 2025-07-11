import { useQuery } from "@tanstack/react-query";
import { fetchNotificationPreferences } from "./fetchNotificationPreferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

export function useNotificationPreferencesQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: !!user?.id,
    ...STANDARD_QUERY_CONFIG, // Uses staleTime: Infinity, refetchOnMount: false
    placeholderData: DEFAULT_NOTIFICATION_PREFERENCES, // Use placeholderData instead of initialData
  });
}