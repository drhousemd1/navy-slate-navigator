import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import type { NotificationPreferences } from './types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types';
import { fetchNotificationPreferences } from './queries/fetchNotificationPreferences';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { useAuth } from '@/contexts/AuthContext';
import { 
  loadNotificationPreferencesFromDB, 
  saveNotificationPreferencesToDB,
  getLastSyncTimeForNotificationPreferences,
  setLastSyncTimeForNotificationPreferences
} from '../indexedDB/useIndexedDB';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notification-preferences'];

export function useNotificationPreferencesData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const queryKey = [...NOTIFICATION_PREFERENCES_QUERY_KEY, user?.id];

  // Query with cache-first approach following the app's pattern
  const {
    data: preferences = DEFAULT_NOTIFICATION_PREFERENCES,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: !!user?.id,
    ...STANDARD_QUERY_CONFIG, // Uses staleTime: Infinity, refetchOnMount: false
  });

  // Update mutation with optimistic updates and IndexedDB sync
  const updateMutation = useMutation({
    mutationFn: async (newPreferences: NotificationPreferences): Promise<NotificationPreferences> => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          { user_id: user!.id, preferences: newPreferences as any },
          { onConflict: 'user_id' }
        )
        .select('preferences')
        .single();

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw error;
      }

      return (data.preferences as unknown as NotificationPreferences) || newPreferences;
    },
    onMutate: async (newPreferences) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<NotificationPreferences>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<NotificationPreferences>(queryKey, newPreferences);

      // Update IndexedDB optimistically
      await saveNotificationPreferencesToDB(newPreferences, user?.id);

      return { previousPreferences };
    },
    onError: async (error, variables, context) => {
      // Revert optimistic update in cache
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKey, context.previousPreferences);
        // Revert IndexedDB too
        await saveNotificationPreferencesToDB(context.previousPreferences, user?.id);
      }
      
      console.error('Failed to update notification preferences:', error);
      toast({
        title: 'Failed to update notification preferences',
        variant: 'destructive'
      });
    },
    onSuccess: async (data) => {
      // Update IndexedDB with confirmed data
      await saveNotificationPreferencesToDB(data, user?.id);
      await setLastSyncTimeForNotificationPreferences(new Date().toISOString(), user?.id);
      
      toast({
        title: 'Notification preferences updated'
      });
    },
  });

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    return updateMutation.mutateAsync(newPreferences);
  };

  return {
    preferences,
    isLoading,
    error: error?.message || null,
    updatePreferences,
    refetch,
    isUpdating: updateMutation.isPending,
  };
}

// Preload function for notification preferences
export async function preloadNotificationPreferences(userId: string) {
  try {
    // Check if we have cached data and if it's fresh (30 minute sync strategy)
    const dataFromDB = await loadNotificationPreferencesFromDB(userId);
    const lastSync = await getLastSyncTimeForNotificationPreferences(userId);
    let shouldFetch = true;

    if (lastSync) {
      const timeDiff = Date.now() - new Date(lastSync).getTime();
      if (timeDiff < 1000 * 60 * 30 && dataFromDB) {
        shouldFetch = false;
      }
    } else if (dataFromDB) {
      shouldFetch = false;
    }

    if (dataFromDB) {
      // Update the cache with cached data
      queryClient.setQueryData([...NOTIFICATION_PREFERENCES_QUERY_KEY, userId], dataFromDB);
      
      // If data is fresh, return early
      if (!shouldFetch) {
        logger.debug("[preloadNotificationPreferences] Using fresh cached data");
        return null;
      }
    }

    // If we should fetch fresh data or have no cached data
    if (shouldFetch) {
      logger.debug("[preloadNotificationPreferences] Fetching fresh data from server");
      try {
        const freshData = await fetchNotificationPreferences(userId);
        queryClient.setQueryData([...NOTIFICATION_PREFERENCES_QUERY_KEY, userId], freshData);
        
        // Save to IndexedDB and update sync time
        await saveNotificationPreferencesToDB(freshData, userId);
        await setLastSyncTimeForNotificationPreferences(new Date().toISOString(), userId);
      } catch (error) {
        logger.error("[preloadNotificationPreferences] Failed to fetch fresh data:", error);
        // Keep using cached data if available
      }
    }

    return null;
  } catch (error) {
    logger.error("Error preloading notification preferences:", error);
    return null;
  }
}
