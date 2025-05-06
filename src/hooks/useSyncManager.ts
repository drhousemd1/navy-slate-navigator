
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { useRewards } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface SyncOptions {
  intervalMs: number;
  enabled: boolean;
  forceSync?: boolean;
}

/**
 * Custom hook that manages periodic background synchronization of critical data
 * without affecting the user experience.
 */
export const useSyncManager = (options: SyncOptions = { intervalMs: 60000, enabled: true }) => {
  const { intervalMs, enabled, forceSync = false } = options;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();
  const location = useLocation();
  const hasInitialSyncedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Track page navigation for force sync
  useEffect(() => {
    if (enabled) {
      const currentPage = location.pathname;
      const lastPage = localStorage.getItem('last-viewed-page');
      
      if (lastPage && lastPage !== currentPage) {
        console.log(`[SyncManager] Page navigation detected from ${lastPage} to ${currentPage}, forcing sync`);
        syncCriticalData(true);
      }
      
      localStorage.setItem('last-viewed-page', currentPage);
    }
  }, [location.pathname, enabled]);

  // Function to sync critical data with improved error handling
  const syncCriticalData = async (force = false) => {
    if (!enabled && !force) return;
    
    // Skip if already syncing unless forced
    if (isSyncing && !force) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return;
    }
    
    try {
      console.log('[SyncManager] Starting background sync of critical data');
      setIsSyncing(true);
      setSyncErrors([]);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        console.log('[SyncManager] No user logged in, skipping sync');
        return;
      }

      // Store the sync start time to detect concurrent updates
      const syncStartTime = new Date().toISOString();
      localStorage.setItem('last-sync-start', syncStartTime);
      
      // Get the current app version to detect changes
      const currentVersion = localStorage.getItem('app-data-version') || '0';
      console.log(`[SyncManager] Current app data version: ${currentVersion}`);
      
      // Perform the data refresh
      await refreshPointsFromDatabase();
      
      // Invalidate queries for each data type to ensure fresh data on next fetch
      if (force) {
        await invalidateAllQueries();
      }
      
      // Update the sync time only if this was the most recent sync started
      // This prevents race conditions with multiple syncs
      const lastStartedSync = localStorage.getItem('last-sync-start');
      if (lastStartedSync === syncStartTime) {
        const newSyncTime = new Date();
        setLastSyncTime(newSyncTime);
        localStorage.setItem('last-sync-time', newSyncTime.toISOString());
        
        // Increment the app version to detect changes
        const newVersion = (parseInt(currentVersion) + 1).toString();
        localStorage.setItem('app-data-version', newVersion);
        console.log(`[SyncManager] Background sync completed successfully, new app version: ${newVersion}`);
        
        // Reset reconnect attempts on successful sync
        reconnectAttemptsRef.current = 0;
        hasInitialSyncedRef.current = true;
      } else {
        console.log('[SyncManager] Another sync started after this one, discarding results');
      }
    } catch (error) {
      console.error('[SyncManager] Error during background sync:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSyncErrors(prev => [...prev, errorMessage]);
      
      // Implement exponential backoff for retries
      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[SyncManager] Retrying sync in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        
        setTimeout(() => {
          syncCriticalData(true);
        }, backoffTime);
      } else if (reconnectAttemptsRef.current > maxReconnectAttempts) {
        // Only show toast after maximum retries to avoid spamming
        toast({
          title: "Sync Error",
          description: "There was a problem synchronizing your data. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Invalidate all relevant queries
  const invalidateAllQueries = async () => {
    console.log('[SyncManager] Force invalidating all queries to fetch fresh data');
    
    // List of query keys to invalidate for all pages
    const queryKeys = [
      REWARDS_POINTS_QUERY_KEY, 
      REWARDS_DOM_POINTS_QUERY_KEY,
      ['rewards'],
      ['rewards', 'supply'],
      ['tasks'],
      ['rules'],
      ['punishments'],
      ['punishment-history'],
      ['weekly-metrics-summary'],
      ['monthly-metrics']
    ];
    
    // Invalidate each query type
    for (const key of queryKeys) {
      await queryClient.invalidateQueries({ queryKey: key });
    }
  };
  
  // Set up the periodic sync
  useEffect(() => {
    if (!enabled) return;
    
    // Initial sync with a small delay to allow components to mount
    if (!hasInitialSyncedRef.current) {
      const initialSyncTimeout = setTimeout(() => {
        syncCriticalData(forceSync);
      }, 500);
      
      return () => {
        clearTimeout(initialSyncTimeout);
      };
    }
    
    // Set up interval for periodic syncs
    timeoutRef.current = setInterval(() => syncCriticalData(), intervalMs);
    
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [intervalMs, enabled, forceSync]);
  
  // Listen to Supabase realtime updates for key tables
  useEffect(() => {
    if (!enabled) return;
    
    // Set up a combined channel for all relevant tables
    const channel = supabase.channel('global-data-changes')
      // Profiles table (points)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[SyncManager] Received realtime update for profiles:', payload);
          refreshPointsFromDatabase();
        }
      )
      // Rewards table
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rewards' },
        (payload) => {
          console.log('[SyncManager] Received realtime update for rewards:', payload);
          queryClient.invalidateQueries({ queryKey: ['rewards'] });
        }
      )
      // Tasks table
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('[SyncManager] Received realtime update for tasks:', payload);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      // Rules table
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rules' },
        (payload) => {
          console.log('[SyncManager] Received realtime update for rules:', payload);
          queryClient.invalidateQueries({ queryKey: ['rules'] });
        }
      )
      // Punishments table
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'punishments' },
        (payload) => {
          console.log('[SyncManager] Received realtime update for punishments:', payload);
          queryClient.invalidateQueries({ queryKey: ['punishments'] });
        }
      )
      .subscribe((status) => {
        console.log('[SyncManager] Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[SyncManager] Successfully subscribed to realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[SyncManager] Error subscribing to realtime updates');
          // Retry subscription with backoff
          reconnectAttemptsRef.current += 1;
          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`[SyncManager] Retrying subscription in ${backoffTime}ms`);
            setTimeout(() => channel.subscribe(), backoffTime);
          }
        }
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
  
  // Return control functions and state
  return {
    syncNow: () => syncCriticalData(true),
    isSyncing,
    lastSyncTime,
    hasErrors: syncErrors.length > 0,
    errors: syncErrors,
    forceRefreshPoints: refreshPointsFromDatabase,
    invalidateCache: invalidateAllQueries
  };
};
