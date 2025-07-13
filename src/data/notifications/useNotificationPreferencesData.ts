import { useNotificationPreferencesQuery } from './queries/useNotificationPreferencesQuery';
import { useUpdateNotificationPreferences } from './mutations/useUpdateNotificationPreferences';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export const useNotificationPreferencesData = () => {
  const { user } = useAuth();
  const userId = user?.id || null;

  // Query - direct database fetch like wellness reminders
  const { data: preferences, isLoading, error } = useNotificationPreferencesQuery(userId);

  // Mutation
  const updateMutation = useUpdateNotificationPreferences(userId);

  // Update function
  const updatePreferences = useCallback(async (
    newPreferences: NotificationPreferences
  ): Promise<NotificationPreferences> => {
    if (!userId) {
      logger.error('[useNotificationPreferencesData] No user ID available');
      throw new Error('User not authenticated');
    }

    try {
      const result = await updateMutation.mutateAsync({ preferences: newPreferences });
      logger.debug('[useNotificationPreferencesData] Preferences updated successfully');
      return result;
    } catch (err) {
      logger.error('[useNotificationPreferencesData] Error updating preferences:', err);
      throw err;
    }
  }, [userId, updateMutation]);

  return {
    // Data - direct return like wellness reminders (no fallback override)
    preferences,
    isLoading: isLoading || updateMutation.isPending,
    error: error?.message || updateMutation.error?.message || null,
    
    // Actions
    updatePreferences,
    
    // Additional state
    isUpdating: updateMutation.isPending,
  };
};