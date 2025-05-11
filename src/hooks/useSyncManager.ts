
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

  // Function to sync critical data
  const syncCriticalData = async (specificKeys?: unknown[][]) => {
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
      
      // Invalidate specific query keys that need refreshing
      const keysToInvalidate = specificKeys || Object.values(CRITICAL_QUERY_KEYS);
      
      // Filter keys based on inclusion/exclusion rules
      const filteredKeys = keysToInvalidate.filter(shouldSyncKey);
      
      for (const key of filteredKeys) {
        queryClient.invalidateQueries({ queryKey: key });
        console.log(`[SyncManager] Invalidated cache for key: ${JSON.stringify(key)}`);
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
          console.log('[SyncManager] Profile update detected:', payload);
          syncCriticalData([CRITICAL_QUERY_KEYS.PROFILE, CRITICAL_QUERY_KEYS.REWARDS_POINTS]);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
  
  return {
    isSyncing,
    lastSyncTime,
    syncNow: syncCriticalData,
    syncKeys: (keys: unknown[][]) => syncCriticalData(keys)
  };
};
