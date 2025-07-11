import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WellnessReminder, UpdateWellnessReminderData } from '../types';
import { WELLNESS_REMINDER_QUERY_KEY } from '../queries/useWellnessReminderQuery';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const useUpdateWellnessReminder = (userId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation<WellnessReminder, Error, { id: string } & UpdateWellnessReminderData>({
    mutationFn: async ({ id, ...variables }) => {
      logger.debug('[useUpdateWellnessReminder] Updating reminder:', { id, variables });

      const { data, error } = await supabase
        .from('wellness_reminders')
        .update(variables)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('[useUpdateWellnessReminder] Error:', error);
        throw error;
      }

      logger.debug('[useUpdateWellnessReminder] Updated reminder:', data);
      return data;
    },
    onSuccess: (reminder) => {
      // Update query cache optimistically
      queryClient.setQueryData([...WELLNESS_REMINDER_QUERY_KEY, userId], reminder);
      
      logger.debug('[useUpdateWellnessReminder] Cache updated with updated reminder');
    },
    onError: (error) => {
      logger.error('[useUpdateWellnessReminder] Error updating reminder:', error);
    }
  });
};