import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferences } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UpdateNotificationPreferencesParams {
  preferences: NotificationPreferences;
}

async function updateNotificationPreferences(
  userId: string, 
  { preferences }: UpdateNotificationPreferencesParams
): Promise<NotificationPreferences> {
  // First try to update existing record
  const { data: updated, error: updateError } = await supabase
    .from('user_notification_preferences')
    .update({ preferences: preferences as any })
    .eq('user_id', userId)
    .select('preferences')
    .maybeSingle();

  if (updateError?.code === 'PGRST116') {
    // No existing record, create one
    const { data: created, error: insertError } = await supabase
      .from('user_notification_preferences')
      .insert({ user_id: userId, preferences: preferences as any })
      .select('preferences')
      .single();

    if (insertError) {
      throw insertError;
    }
    return created.preferences as unknown as NotificationPreferences;
  }

  if (updateError) {
    throw updateError;
  }

  return (updated?.preferences as unknown as NotificationPreferences) || preferences;
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
      toast.error('Failed to update notification preferences');
    },
    onSuccess: () => {
      toast.success('Notification preferences updated');
    },
  });
}