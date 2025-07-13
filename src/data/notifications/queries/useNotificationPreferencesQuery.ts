import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '../types';
import { logger } from '@/lib/logger';

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notification-preferences'] as const;

export const fetchNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  logger.debug('[fetchNotificationPreferences] Fetching preferences for user:', userId);
  
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('[fetchNotificationPreferences] Error:', error);
    throw error;
  }

  if (!data?.preferences) {
    logger.debug('[fetchNotificationPreferences] No preferences found, returning defaults');
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const preferences = data.preferences as unknown as NotificationPreferences;
  logger.debug('[fetchNotificationPreferences] Result:', preferences);
  return preferences;
};

export const useNotificationPreferencesQuery = (userId: string | null) => {
  return useQuery({
    queryKey: [...NOTIFICATION_PREFERENCES_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return fetchNotificationPreferences(userId);
    },
    enabled: !!userId,
    staleTime: Infinity,
  });
};