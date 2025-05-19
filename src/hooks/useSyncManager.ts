import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { toast } from '@/hooks/use-toast';

// Define critical query keys for the application
export const CRITICAL_QUERY_KEYS = {
  TASKS: ['tasks'] as QueryKey,
  REWARDS: ['rewards'] as QueryKey,
  REWARDS_POINTS: REWARDS_POINTS_QUERY_KEY as QueryKey,
  REWARDS_DOM_POINTS: REWARDS_DOM_POINTS_QUERY_KEY as QueryKey,
  PUNISHMENTS: ['punishments'] as QueryKey,
  RULES: ['rules'] as QueryKey,
  PROFILE: ['profile'] as QueryKey,
};

export interface SyncOptions {
  intervalMs?: number;
  enabled?: boolean;
  includeKeys?: QueryKey[];
  excludeKeys?: QueryKey[];
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
  // const { refreshPointsFromDatabase } = useRewards(); // Removed, see note above

  // Helper to check if a key should be synced
  const shouldSyncKey = (key: QueryKey) => {
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
  const syncCriticalData = async (specificKeys?: QueryKey[]) => {
    if (!enabled || isSyncing) return; // Prevent concurrent syncs
    
    setIsSyncing(true);
    console.log('[SyncManager] Starting background sync of critical data...');
    let overallSyncSuccess = true;

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

      // Refreshing points directly can be tricky with general sync.
      // It's better to invalidate queries that fetch points (e.g., ['profile'], REWARDS_POINTS_QUERY_KEY).
      // The original refreshPointsFromDatabase was likely an imperative fetch; reactive invalidation is preferred.
      // We will rely on invalidating relevant query keys like PROFILE and points-specific keys.

      const keysToInvalidate = specificKeys || includeKeys;
      const filteredKeys = keysToInvalidate.filter(shouldSyncKey);

      if (filteredKeys.length > 0) {
        console.log(`[SyncManager] Attempting to invalidate ${filteredKeys.length} query key(s):`, filteredKeys.map(k => JSON.stringify(k)));
        
        const invalidationPromises = filteredKeys.map(key =>
          queryClient.invalidateQueries({ queryKey: key })
            .then(() => {
              console.log(`[SyncManager] Successfully invalidated cache for key: ${JSON.stringify(key)}`);
              return { key: JSON.stringify(key), status: 'fulfilled' };
            })
            .catch(err => {
              console.error(`[SyncManager] Error invalidating key ${JSON.stringify(key)}:`, err);
              overallSyncSuccess = false; // Mark sync as partially failed if any invalidation fails
              return { key: JSON.stringify(key), status: 'rejected', reason: err };
            })
        );
        
        await Promise.all(invalidationPromises); // Process all invalidations

        if (!overallSyncSuccess) {
            console.warn('[SyncManager] One or more query key invalidations failed during sync.');
            // Optionally, a toast for partial failure if showToasts is true
            if (showToasts) {
                 toast({ title: "Sync Incomplete", description: "Some data may not be up-to-date. Check console for details.", variant: "default" });
            }
        }

      } else {
        console.log('[SyncManager] No keys to invalidate based on current filters.');
      }
      
      setLastSyncTime(new Date());

      if (overallSyncSuccess && showToasts) {
        toast({
          title: "Data Synchronized",
          description: `App data sync completed at ${new Date().toLocaleTimeString()}`,
          variant: "default",
        });
      }
      console.log('[SyncManager] Background sync attempt completed.');

    } catch (error) {
      console.error('[SyncManager] Critical error during background sync process:', error);
      overallSyncSuccess = false;
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
    }, 5000);
    
    if (timeoutRef.current) clearInterval(timeoutRef.current);
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
  }, [intervalMs, enabled, queryClient]); // Removed refreshPointsFromDatabase dependency
  
  // Listen to Supabase realtime updates for the profiles table for points changes
  useEffect(() => {
    if (!enabled) return;
    
    const setupPointsSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[SyncManager] No user for realtime points subscription.');
        return null;
      }

      const channel = supabase.channel(`sync-manager-profiles-changes-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            console.log('[SyncManager] Profile update detected via Supabase Realtime:', payload);
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
    syncKeys: (keys: QueryKey[]) => {
      console.log(`[SyncManager] Manual sync triggered for specific keys:`, keys.map(k => JSON.stringify(k)));
      syncCriticalData(keys);
    }
  };
};
