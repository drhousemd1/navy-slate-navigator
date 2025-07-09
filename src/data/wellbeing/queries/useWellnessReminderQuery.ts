import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WellnessReminder } from '../types';
import { logger } from '@/lib/logger';

export const WELLNESS_REMINDER_QUERY_KEY = ['wellness-reminder'] as const;

export const fetchWellnessReminder = async (userId: string): Promise<WellnessReminder | null> => {
  logger.debug('[fetchWellnessReminder] Fetching reminder for user:', userId);
  
  const { data, error } = await supabase
    .from('wellness_reminders')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('[fetchWellnessReminder] Error:', error);
    throw error;
  }

  logger.debug('[fetchWellnessReminder] Result:', data);
  return data;
};

export const useWellnessReminderQuery = (userId: string | null) => {
  return useQuery({
    queryKey: [...WELLNESS_REMINDER_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return fetchWellnessReminder(userId);
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};