import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferences } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

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

  return useMutation({
    mutationFn: (params: UpdateNotificationPreferencesParams) =>
      updateNotificationPreferences(user!.id, params),
    onMutate: async ({ preferences }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['notification-preferences', user?.id] 
      });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<NotificationPreferences>([
        'notification-preferences', 
        user?.id
      ]);

      // Optimistically update cache
      queryClient.setQueryData<NotificationPreferences>(
        ['notification-preferences', user?.id],
        preferences
      );

      return { previousPreferences };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          ['notification-preferences', user?.id],
          context.previousPreferences
        );
      }
      
      console.error('Failed to update notification preferences:', error);
      toast({
        title: 'Failed to update notification preferences',
        variant: 'destructive'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Notification preferences updated'
      });
    },
  });
}