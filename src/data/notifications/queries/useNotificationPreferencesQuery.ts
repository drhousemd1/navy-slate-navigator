import { useQuery } from "@tanstack/react-query";
import { fetchNotificationPreferences } from "./fetchNotificationPreferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types";
import { useAuth } from "@/contexts/AuthContext";

export function useNotificationPreferencesQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: DEFAULT_NOTIFICATION_PREFERENCES,
  });
}