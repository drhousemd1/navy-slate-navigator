import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NotificationPreferences } from '../types';
import { NOTIFICATION_PREFERENCES_QUERY_KEY } from '../queries/useNotificationPreferencesQuery';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

interface UpdateNotificationPreferencesParams {
  preferences: NotificationPreferences;
}

export const useUpdateNotificationPreferences = (userId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation<NotificationPreferences, Error, UpdateNotificationPreferencesParams>({
    mutationFn: async ({ preferences }) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      logger.debug('[useUpdateNotificationPreferences] Updating preferences:', preferences);

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          { user_id: userId, preferences: preferences as any },
          { onConflict: 'user_id' }
        )
        .select('preferences')
        .single();

      if (error) {
        logger.error('[useUpdateNotificationPreferences] Error:', error);
        throw error;
      }

      const result = (data.preferences as unknown as NotificationPreferences) || preferences;
      logger.debug('[useUpdateNotificationPreferences] Updated preferences:', result);
      return result;
    },
    onSuccess: (preferences) => {
      // Update query cache optimistically
      queryClient.setQueryData([...NOTIFICATION_PREFERENCES_QUERY_KEY, userId], preferences);
      
      logger.debug('[useUpdateNotificationPreferences] Cache updated with updated preferences');
      
      toast({
        title: 'Notification preferences updated'
      });
    },
    onError: (error) => {
      logger.error('[useUpdateNotificationPreferences] Error updating preferences:', error);
      
      toast({
        title: 'Failed to update notification preferences',
        variant: 'destructive'
      });
    }
  });
};