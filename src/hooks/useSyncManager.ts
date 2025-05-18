import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, QueryKey } from '@tanstack/react-query'; // Added QueryKey for explicit typing
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
  PROFILE: ['profile'] // Assuming 'profile' might be a query key for user profile data
};

interface SyncOptions {
  intervalMs?: number;
  enabled?: boolean;
  includeKeys?: QueryKey[]; // Use QueryKey type
  excludeKeys?: QueryKey[]; // Use QueryKey type
  showToasts?: boolean;
}

/**
 * Enhanced custom hook that manages synchronization of critical data
 * with improved React Query integration and more control options.
 * Note on Conflict Resolution: This sync manager primarily handles cache invalidation
 * to keep client data fresh, reducing the likelihood of stale data conflicts.
 * True data merge conflict resolution (e.g., for concurrent edits) is typically
 * managed by optimistic mutation patterns and server-side logic.
 */
export const useSyncManager = (options: SyncOptions = {}) => {
  const {
    intervalMs = 60000, // Default to 1 minute
    enabled = true,
    includeKeys = Object.values(CRITICAL_QUERY_KEYS),
    excludeKeys = [],
    showToasts = false // Default to false to avoid too many toasts
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();

  // Helper to check if a key should be synced
  const shouldSyncKey = (key: QueryKey) => { // Use QueryKey type
    const keyStr = JSON.stringify(key);
    // Check if key is explicitly excluded
    if (excludeKeys.some(excludeKey => JSON.stringify(excludeKey) === keyStr)) {
      return false;
    }
    // Check if key is included in the includeKeys
    return includeKeys.some(includeKey => {
      const includeKeyStr = JSON.stringify(includeKey);
      // Match by prefix (e.g., ['tasks'] matches ['tasks', '123'])
      // or exact match if the includeKey isn't just a prefix.
      return keyStr.startsWith(includeKeyStr.substring(0, includeKeyStr.length - 1)) || keyStr === includeKeyStr;
    });
  };

  // Function to sync critical data
  const syncCriticalData = async (specificKeys?: QueryKey[]) => { // Use QueryKey type
    if (!enabled || isSyncing) return; // Prevent concurrent syncs
    
    setIsSyncing(true);
    console.log('[SyncManager] Starting background sync of critical data...');
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        console.warn('[SyncManager] No user logged in or error fetching user, skipping sync.', userError);
        if (showToasts && userError) {
            toast({ title: "Sync Manager Error", description: "Could not fetch user for sync.", variant: "default" });
        }
        setIsSyncing(false);
        return;
      }
      
      // Attempt to refresh points data from database with retry logic
      let attempts = 0;
      let pointsRefreshed = false;
      const maxAttempts = 3;
      while (attempts < maxAttempts && !pointsRefreshed) {
        try {
          await refreshPointsFromDatabase();
          pointsRefreshed = true;
          console.log(`[SyncManager] Points refreshed successfully (attempt ${attempts + 1}/${maxAttempts}).`);
        } catch (pointsErrorAttempt) {
          attempts++;
          console.error(`[SyncManager] Error refreshing points (attempt ${attempts}/${maxAttempts}):`, pointsErrorAttempt);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // 1s, 2s delay
          } else {
            // Only show toast on final failure if showToasts is enabled
            if (showToasts) {
                toast({ title: "Points Sync Failed", description: "Could not refresh points data after multiple attempts.", variant: "default" });
            }
            console.error('[SyncManager] Failed to refresh points after multiple attempts.');
          }
        }
      }
      // If points refresh ultimately failed, it's logged. Continue with other invalidations.
      
      const keysToInvalidate = specificKeys || includeKeys; // Use includeKeys if no specificKeys provided
      
      const filteredKeys = keysToInvalidate.filter(shouldSyncKey);
      
      if (filteredKeys.length > 0) {
        console.log(`[SyncManager] Invalidating ${filteredKeys.length} query key(s):`, filteredKeys.map(k => JSON.stringify(k)));
        await Promise.all(filteredKeys.map(key => 
          queryClient.invalidateQueries({ queryKey: key })
            .then(() => console.log(`[SyncManager] Invalidated cache for key: ${JSON.stringify(key)}`))
            .catch(err => console.error(`[SyncManager] Error invalidating key ${JSON.stringify(key)}:`, err))
        ));
      } else {
        console.log('[SyncManager] No keys to invalidate based on current filters.');
      }
      
      setLastSyncTime(new Date());
      
      if (showToasts) {
        toast({
          title: "Data Synchronized",
          description: `App data sync completed at ${new Date().toLocaleTimeString()}`,
          variant: "default" // Using default variant for successful sync
        });
      }
      console.log('[SyncManager] Background sync completed.');

    } catch (error) {
      console.error('[SyncManager] Critical error during background sync process:', error);
      // For robust telemetry, this error should be sent to an external monitoring service.
      if (showToasts) {
        toast({
          title: "Sync Failed",
          description: "An unexpected error occurred during data synchronization.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Set up the periodic sync
  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      return;
    }
    
    // Initial sync with a slight delay
    const initialTimer = setTimeout(() => {
      console.log('[SyncManager] Triggering initial sync.');
      syncCriticalData();
    }, 5000); // Increased delay to ensure app is stable
    
    // Set up interval for periodic syncs
    if (timeoutRef.current) clearInterval(timeoutRef.current); // Clear existing interval if enabled state changes
    timeoutRef.current = setInterval(() => {
      console.log('[SyncManager] Triggering periodic sync.');
      syncCriticalData();
    }, intervalMs);
    
    return () => {
      clearTimeout(initialTimer);
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      console.log('[SyncManager] Cleaned up sync intervals.');
    };
  }, [intervalMs, enabled, queryClient, refreshPointsFromDatabase]); // Added refreshPointsFromDatabase to dependencies
  
  // Listen to Supabase realtime updates for the profiles table for points changes
  useEffect(() => {
    if (!enabled) return;
    
    const setupPointsSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[SyncManager] No user for realtime points subscription.');
        return null;
      }

      const channel = supabase.channel(`sync-manager-profiles-changes-${user.id}`) // User-specific channel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            console.log('[SyncManager] Profile update detected via Supabase Realtime:', payload);
            // Specifically invalidate points and profile related queries
            syncCriticalData([CRITICAL_QUERY_KEYS.PROFILE, CRITICAL_QUERY_KEYS.REWARDS_POINTS, CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS]);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[SyncManager] Subscribed to profile changes for user ${user.id}.`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[SyncManager] Error subscribing to profile changes: ${status}`, err);
          }
        });
        
      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    setupPointsSubscription().then(ch => channel = ch);
      
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
          .then(() => console.log('[SyncManager] Unsubscribed from profile changes.'))
          .catch(err => console.error('[SyncManager] Error unsubscribing from profile changes:', err));
      }
    };
  }, [enabled, queryClient]); // Added queryClient
  
  return {
    isSyncing,
    lastSyncTime,
    syncNow: () => {
      console.log('[SyncManager] Manual sync triggered.');
      syncCriticalData();
    },
    syncKeys: (keys: QueryKey[]) => { // Use QueryKey type
      console.log(`[SyncManager] Manual sync triggered for specific keys:`, keys.map(k => JSON.stringify(k)));
      syncCriticalData(keys);
    }
  };
};
