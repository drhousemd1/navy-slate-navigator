import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WellnessReminder, CreateWellnessReminderData } from '../types';
import { WELLNESS_REMINDER_QUERY_KEY } from '../queries/useWellnessReminderQuery';
import { logger } from '@/lib/logger';
import { toastManager } from '@/lib/toastManager';
import { getErrorMessage } from '@/lib/errors';

export const useCreateWellnessReminder = (userId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation<WellnessReminder, Error, CreateWellnessReminderData>({
    mutationFn: async (variables: CreateWellnessReminderData) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      logger.debug('[useCreateWellnessReminder] Creating reminder:', variables);

      const { data, error } = await supabase
        .from('wellness_reminders')
        .insert([{
          user_id: userId,
          ...variables
        }])
        .select()
        .single();

      if (error) {
        logger.error('[useCreateWellnessReminder] Error:', error);
        throw error;
      }

      logger.debug('[useCreateWellnessReminder] Created reminder:', data);
      return data;
    },
    onSuccess: (reminder) => {
      // Update query cache optimistically
      queryClient.setQueryData([...WELLNESS_REMINDER_QUERY_KEY, userId], reminder);
      
      logger.debug('[useCreateWellnessReminder] Cache updated with new reminder');
      toastManager.success('Reminder Created', 'Wellness reminder has been set up successfully.');
    },
    onError: (error) => {
      logger.error('[useCreateWellnessReminder] Error creating reminder:', error);
      toastManager.error('Failed to Create Reminder', getErrorMessage(error));
    }
  });
};