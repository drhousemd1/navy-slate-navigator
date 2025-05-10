
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { useRewards } from '@/contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';

// Define critical query keys for the application
export const CRITICAL_QUERY_KEYS = {
  TASKS: ['tasks'],
  REWARDS: ['rewards'],
  REWARDS_POINTS: REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS: REWARDS_DOM_POINTS_QUERY_KEY,
  PUNISHMENTS: ['punishments'],
  RULES: ['rules'],
  PROFILE: ['profile']
};

interface SyncOptions {
  intervalMs?: number;
  enabled?: boolean;
  includeKeys?: string[][];
  excludeKeys?: string[][];
  showToasts?: boolean;
}

/**
 * Enhanced custom hook that manages synchronization of critical data
 * with improved React Query integration and more control options.
 */
export const useSyncManager = (options: SyncOptions = {}) => {
  const {
    intervalMs = 60000,
    enabled = true,
    includeKeys = Object.values(CRITICAL_QUERY_KEYS),
    excludeKeys = [],
    showToasts = false
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();

  // Helper to check if a key should be synced
  const shouldSyncKey = (key: unknown[]) => {
    const keyStr = JSON.stringify(key);
    // Check if key is explicitly excluded
    if (excludeKeys.some(excludeKey => JSON.stringify(excludeKey) === keyStr)) {
      return false;
    }
    // Check if key is included in the includeKeys or if includeKeys is empty
    return includeKeys.some(includeKey => {
      // Match by prefix (e.g., ['tasks'] matches ['tasks', '123'])
      const includeKeyStr = JSON.stringify(includeKey);
      return keyStr.startsWith(includeKeyStr.substring(0, includeKeyStr.length - 1));
    });
  };

  // Function to sync critical data with improved error handling
  const syncCriticalData = async (specificKeys?: unknown[][]) => {
    if (!enabled) return;
    
    try {
      console.log('[SyncManager] Starting background sync of critical data');
      setIsSyncing(true);
      
      // Get current user with timeout handling
      const userPromise = supabase.auth.getUser();
      const userTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User fetch timed out')), 5000);
      });
      
      const { data: userData } = await Promise.race([
        userPromise, 
        userTimeoutPromise
      ]) as { data: { user?: { id: string } } };
      
      if (!userData?.user?.id) {
        console.log('[SyncManager] No user logged in, skipping sync');
        return;
      }
      
      // Try to refresh points data from local cache if database fails
      try {
        await refreshPointsFromDatabase();
      } catch (error) {
        console.error('[SyncManager] Error refreshing points:', error);
        // Continue with other operations even if points refresh fails
      }
      
      // Invalidate specific query keys that need refreshing
      const keysToInvalidate = specificKeys || Object.values(CRITICAL_QUERY_KEYS);
      
      // Filter keys based on inclusion/exclusion rules
      const filteredKeys = keysToInvalidate.filter(shouldSyncKey);
      
      // Track successful syncs
      const successfulSyncs: string[] = [];
      const failedSyncs: string[] = [];
      
      for (const key of filteredKeys) {
        try {
          await queryClient.invalidateQueries({ queryKey: key });
          console.log(`[SyncManager] Invalidated cache for key: ${JSON.stringify(key)}`);
          successfulSyncs.push(JSON.stringify(key));
          
          // Clear any previous error for this key
          setSyncErrors(prev => ({ ...prev, [JSON.stringify(key)]: false }));
        } catch (keyError) {
          console.error(`[SyncManager] Error invalidating key ${JSON.stringify(key)}:`, keyError);
          failedSyncs.push(JSON.stringify(key));
          
          // Track error for this key
          setSyncErrors(prev => ({ ...prev, [JSON.stringify(key)]: true }));
        }
      }
      
      setLastSyncTime(new Date());
      
      if (showToasts) {
        if (successfulSyncs.length > 0) {
          toast({
            title: "Data synchronized",
            description: `Successfully synchronized app data at ${new Date().toLocaleTimeString()}`,
            variant: "default"
          });
        }
        
        if (failedSyncs.length > 0) {
          toast({
            title: "Partial sync failure",
            description: "Some data couldn't be synchronized. Using cached data where available.",
            variant: "warning"
          });
        }
      }
      
      console.log('[SyncManager] Background sync completed');
    } catch (error) {
      console.error('[SyncManager] Error during background sync:', error);
      
      if (showToasts) {
        toast({
          title: "Sync failed",
          description: "Could not synchronize data. Using cached data where available.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Set up the periodic sync
  useEffect(() => {
    if (!enabled) return;
    
    // Initial sync with a slight delay to avoid initial render performance impact
    const initialTimer = setTimeout(() => syncCriticalData(), 500);
    
    // Set up interval for periodic syncs
    timeoutRef.current = setInterval(syncCriticalData, intervalMs);
    
    return () => {
      clearTimeout(initialTimer);
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [intervalMs, enabled]);
  
  // Listen to Supabase realtime updates for the profiles table
  useEffect(() => {
    if (!enabled) return;
    
    const channel = supabase.channel('sync-manager-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[SyncManager] Received realtime update for profiles:', payload);
          // Trigger a sync when the profiles table is updated
          syncCriticalData([CRITICAL_QUERY_KEYS.PROFILE, CRITICAL_QUERY_KEYS.REWARDS_POINTS]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          console.log('[SyncManager] Received realtime update for tasks');
          syncCriticalData([CRITICAL_QUERY_KEYS.TASKS]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rewards' },
        () => {
          console.log('[SyncManager] Received realtime update for rewards');
          syncCriticalData([CRITICAL_QUERY_KEYS.REWARDS]);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
  
  // Return enhanced control functions and state
  return {
    syncNow: syncCriticalData,
    isSyncing,
    lastSyncTime,
    syncErrors,
    forceRefreshPoints: refreshPointsFromDatabase,
    invalidateCache: (keys?: string[][]) => {
      queryClient.invalidateQueries({ queryKey: keys || CRITICAL_QUERY_KEYS.TASKS });
      syncCriticalData(keys);
    },
    forceFullRefresh: async () => {
      queryClient.clear(); // Clear the entire cache
      await syncCriticalData(); // Then resync everything
      
      toast({
        title: "Cache refreshed",
        description: "All data has been refreshed from the server",
        variant: "default"
      });
    }
  };
};
