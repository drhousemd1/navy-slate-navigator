
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { useRewards } from '@/contexts/RewardsContext';

/**
 * Custom hook that manages periodic background synchronization of critical data
 * without affecting the user experience.
 */
export const useSyncManager = (options = { intervalMs: 60000, enabled: true }) => {
  const { intervalMs, enabled } = options;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();

  // Function to sync critical data
  const syncCriticalData = async () => {
    if (!enabled) return;
    
    try {
      console.log('[SyncManager] Starting background sync of critical data');
      setIsSyncing(true);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        console.log('[SyncManager] No user logged in, skipping sync');
        return;
      }
      
      // Refresh points data from database
      await refreshPointsFromDatabase();
      
      // Additional data syncs can be added here
      
      setLastSyncTime(new Date());
      console.log('[SyncManager] Background sync completed successfully');
    } catch (error) {
      console.error('[SyncManager] Error during background sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Set up the periodic sync
  useEffect(() => {
    if (!enabled) return;
    
    // Initial sync
    syncCriticalData();
    
    // Set up interval for periodic syncs
    timeoutRef.current = setInterval(syncCriticalData, intervalMs);
    
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [intervalMs, enabled]);
  
  // Listen to Supabase realtime updates for the profiles table
  useEffect(() => {
    if (!enabled) return;
    
    const channel = supabase.channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[SyncManager] Received realtime update for profiles:', payload);
          // Trigger a sync when the profiles table is updated
          syncCriticalData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
  
  // Return control functions and state
  return {
    syncNow: syncCriticalData,
    isSyncing,
    lastSyncTime,
    forceRefreshPoints: refreshPointsFromDatabase,
    invalidateCache: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      syncCriticalData();
    }
  };
};
