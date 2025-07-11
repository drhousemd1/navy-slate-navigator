import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WELLNESS_REMINDER_QUERY_KEY } from '../queries/useWellnessReminderQuery';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const useDeleteWellnessReminder = (userId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (reminderId: string) => {
      logger.debug('[useDeleteWellnessReminder] Deleting reminder:', reminderId);

      const { error } = await supabase
        .from('wellness_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) {
        logger.error('[useDeleteWellnessReminder] Error:', error);
        throw error;
      }

      logger.debug('[useDeleteWellnessReminder] Deleted reminder successfully');
    },
    onSuccess: () => {
      // Clear query cache
      queryClient.setQueryData([...WELLNESS_REMINDER_QUERY_KEY, userId], null);
      
      logger.debug('[useDeleteWellnessReminder] Cache cleared');
    },
    onError: (error) => {
      logger.error('[useDeleteWellnessReminder] Error deleting reminder:', error);
    }
  });
};