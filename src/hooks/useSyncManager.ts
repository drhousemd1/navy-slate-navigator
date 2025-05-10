
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
  maxRetries?: number;
}

/**
 * Enhanced custom hook that manages synchronization of critical data
 * with improved React Query integration, error handling, and more control options.
 */
export const useSyncManager = (options: SyncOptions = {}) => {
  const {
    intervalMs = 60000,
    enabled = true,
    includeKeys = Object.values(CRITICAL_QUERY_KEYS),
    excludeKeys = [],
    showToasts = false,
    maxRetries = 3
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, number>>({});
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

  // Function to check authentication without throwing
  const checkAuthentication = async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getUser();
      return !!data?.user?.id;
    } catch (error) {
      console.error('[SyncManager] Auth check error:', error);
      return false;
    }
  };

  // Function to sync critical data
  const syncCriticalData = async (specificKeys?: unknown[][]) => {
    if (!enabled) return;
    
    try {
      console.log('[SyncManager] Starting background sync of critical data');
      setIsSyncing(true);
      
      // Get current user - with error handling
      const isAuthenticated = await checkAuthentication();
      if (!isAuthenticated) {
        console.log('[SyncManager] No user logged in, skipping sync');
        return;
      }
      
      // Refresh points data from database
      try {
        await refreshPointsFromDatabase();
      } catch (error) {
        console.error('[SyncManager] Error refreshing points:', error);
        // Don't fail the entire sync process for this
      }
      
      // Invalidate specific query keys that need refreshing
      const keysToInvalidate = specificKeys || Object.values(CRITICAL_QUERY_KEYS);
      
      // Filter keys based on inclusion/exclusion rules
      const filteredKeys = keysToInvalidate.filter(shouldSyncKey);
      
      for (const key of filteredKeys) {
        try {
          const keyStr = JSON.stringify(key);
          
          // Skip keys that have failed too many times
          if (syncErrors[keyStr] && syncErrors[keyStr] >= maxRetries) {
            console.log(`[SyncManager] Skipping key ${keyStr} - too many failures`);
            continue;
          }
          
          queryClient.invalidateQueries({ queryKey: key });
          console.log(`[SyncManager] Invalidated cache for key: ${keyStr}`);
          
          // Reset error count for successful keys
          if (syncErrors[keyStr]) {
            setSyncErrors(prev => ({
              ...prev,
              [keyStr]: 0
            }));
          }
        } catch (error) {
          console.error(`[SyncManager] Error invalidating key ${JSON.stringify(key)}:`, error);
          
          const keyStr = JSON.stringify(key);
          setSyncErrors(prev => ({
            ...prev,
            [keyStr]: (prev[keyStr] || 0) + 1
          }));
        }
      }
      
      setLastSyncTime(new Date());
      
      if (showToasts) {
        toast({
          title: "Data synchronized",
          description: `Successfully synchronized app data at ${new Date().toLocaleTimeString()}`,
          variant: "default"
        });
      }
      
      console.log('[SyncManager] Background sync completed successfully');
    } catch (error) {
      console.error('[SyncManager] Error during background sync:', error);
      
      if (showToasts) {
        toast({
          title: "Sync failed",
          description: "Could not synchronize data. Please check your connection.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Function to reset the sync state completely
  const resetSyncState = () => {
    console.log('[SyncManager] Resetting sync state');
    setSyncErrors({});
    setLastSyncTime(null);
    setIsSyncing(false);
    
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Start a new sync cycle after a brief delay
    setTimeout(() => {
      syncCriticalData();
      
      // Restart interval
      if (enabled && intervalMs > 0) {
        timeoutRef.current = setInterval(syncCriticalData, intervalMs);
      }
    }, 1000);
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
  
  // Listen for auth state changes to reset sync if needed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[SyncManager] Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        console.log('[SyncManager] User signed in, resetting sync state');
        resetSyncState();
      } else if (event === 'SIGNED_OUT') {
        console.log('[SyncManager] User signed out, clearing cache');
        queryClient.clear();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Function to force a complete refresh of all cache
  const forceFullRefresh = async () => {
    console.log('[SyncManager] Forcing full cache refresh');
    queryClient.clear(); // Clear the entire cache
    resetSyncState(); // Reset sync state and trigger a new sync cycle
    
    toast({
      title: "Cache refreshed",
      description: "All data has been refreshed from the server",
      variant: "default"
    });
  };
  
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
    forceFullRefresh,
    resetSyncState
  };
};
