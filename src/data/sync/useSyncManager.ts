
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '../queryClient';

interface SyncOptions {
  showToasts?: boolean;
  intervalMs?: number;
  enabled?: boolean;
  includeKeys?: string[][];
  excludeKeys?: string[][];
}

// Define critical query keys for the application
export const CRITICAL_QUERY_KEYS = {
  TASKS: ['tasks'],
  REWARDS: ['rewards'],
  RULES: ['rules'],
  PUNISHMENTS: ['punishments'],
  ADMIN_CARDS: ['adminCards'],
  MONTHLY_METRICS: ['monthly-metrics'],
  WEEKLY_METRICS: ['weekly-metrics-summary']
};

export function useSyncManager(options: SyncOptions = {}) {
  const { 
    showToasts = false, 
    intervalMs = 60000, 
    enabled = true,
    includeKeys = Object.values(CRITICAL_QUERY_KEYS),
    excludeKeys = []
  } = options;
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

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

  // Sync a specific card by ID
  const syncCardById = useCallback(async (
    id: string, 
    type: 'tasks' | 'rules' | 'rewards' | 'punishments' | 'admin_testing_cards'
  ): Promise<void> => {
    if (!id) return;
    
    try {
      setIsSyncing(true);
      
      // Fetch just this single card from Supabase
      const { data, error } = await supabase
        .from(type)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Map the appropriate queryKey based on type
        const queryKey = type === 'admin_testing_cards' ? 'adminCards' : type;
        
        // Update just this one item in the cache
        queryClient.setQueryData([queryKey], (oldData: any[] = []) => {
          return Array.isArray(oldData) ? oldData.map(item => item.id === id ? data : item) : [];
        });
      }
    } catch (err) {
      console.error(`Error syncing ${type} item ${id}:`, err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync all data
  const syncNow = useCallback(async (specificKeys?: unknown[][]) => {
    if (!enabled) return;
    
    try {
      setIsSyncing(true);
      if (showToasts) {
        toast({
          title: "Syncing",
          description: "Syncing data with server...",
        });
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        console.log('[SyncManager] No user logged in, skipping sync');
        return;
      }
      
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
          title: "Sync Complete",
          description: "Data successfully synchronized",
        });
      }
      
      console.log('[SyncManager] Background sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
      
      if (showToasts) {
        toast({
          title: "Sync Failed",
          description: "Could not synchronize data. Will try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [showToasts, enabled, shouldSyncKey]);

  // Set up sync interval
  useEffect(() => {
    if (!enabled) return;
    
    // Initial sync when component mounts
    syncNow();
    
    // Setup interval for background syncing
    const interval = setInterval(() => {
      syncNow();
    }, intervalMs);
    
    return () => {
      clearInterval(interval);
    };
  }, [syncNow, intervalMs, enabled]);

  return {
    isSyncing,
    lastSyncTime,
    syncNow,
    syncCardById
  };
}

// Export single-use functions
export const syncCardById = async (
  id: string,
  type: 'tasks' | 'rules' | 'rewards' | 'punishments' | 'admin_testing_cards'
): Promise<void> => {
  if (!id) return;
  
  try {
    // Fetch just this single card from Supabase
    const { data, error } = await supabase
      .from(type)
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    if (data) {
      // Map the appropriate queryKey based on type
      const queryKey = type === 'admin_testing_cards' ? 'adminCards' : type;
      
      // Update just this one item in the cache
      queryClient.setQueryData([queryKey], (oldData: any[] = []) => {
        return Array.isArray(oldData) ? oldData.map(item => item.id === id ? data : item) : [];
      });
    }
  } catch (err) {
    console.error(`Error syncing ${type} item ${id}:`, err);
  }
};
