import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferences } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { NOTIFICATION_PREFERENCES_QUERY_KEY } from "../useNotificationPreferencesData";
import { 
  saveNotificationPreferencesToDB,
  setLastSyncTimeForNotificationPreferences
} from "../../indexedDB/useIndexedDB";

interface UpdateNotificationPreferencesParams {
  preferences: NotificationPreferences;
}

async function updateNotificationPreferences(
  userId: string, 
  { preferences }: UpdateNotificationPreferencesParams
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .upsert(
      { user_id: userId, preferences: preferences as any },
      { onConflict: 'user_id' }
    )
    .select('preferences')
    .single();

  if (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }

  return (data.preferences as unknown as NotificationPreferences) || preferences;
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [...NOTIFICATION_PREFERENCES_QUERY_KEY, user?.id];

  return useMutation({
    mutationFn: (params: UpdateNotificationPreferencesParams) =>
      updateNotificationPreferences(user!.id, params),
    onMutate: async ({ preferences }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<NotificationPreferences>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<NotificationPreferences>(queryKey, preferences);

      // Update IndexedDB optimistically
      await saveNotificationPreferencesToDB(preferences, user?.id);

      return { previousPreferences };
    },
    onError: async (error, variables, context) => {
      // Revert optimistic update in cache
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKey, context.previousPreferences);
        // Revert IndexedDB too
        await saveNotificationPreferencesToDB(context.previousPreferences, user?.id);
      }
      
      console.error('Failed to update notification preferences:', error);
      toast({
        title: 'Failed to update notification preferences',
        variant: 'destructive'
      });
    },
    onSuccess: async (data) => {
      // Update IndexedDB with confirmed data
      await saveNotificationPreferencesToDB(data, user?.id);
      await setLastSyncTimeForNotificationPreferences(new Date().toISOString(), user?.id);
      
      toast({
        title: 'Notification preferences updated'
      });
    },
  });
}