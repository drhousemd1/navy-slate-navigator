import { useNotificationPreferencesQuery } from '@/data/notifications';

// Re-export the query hook with a simpler interface for backward compatibility
export const useNotificationPreferences = () => {
  const query = useNotificationPreferencesQuery();
  
  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    pushSubscription: null, // Will be handled by the notification manager
    enableNotifications: () => {}, // Handled by useNotificationManager
    disableNotifications: () => {}, // Handled by useNotificationManager
    updateNotificationType: () => {}, // Handled by useNotificationManager
    savePreferences: () => {}, // Handled by useNotificationManager
    loadPreferences: () => query.refetch(), // Refetch from database
  };
};