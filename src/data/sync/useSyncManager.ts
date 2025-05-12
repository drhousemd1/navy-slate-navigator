
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useState, useEffect, useCallback } from 'react';
import { queryClient } from '../queryClient';
import { clearAllCachedData, clearOldCacheVersions } from '../indexedDB/useIndexedDB';

interface SyncManagerOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export const useSyncManager = (options: SyncManagerOptions = {}) => {
  const { intervalMs = 30000, enabled = true } = options;
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const syncNow = useCallback(async () => {
    console.log('Syncing data with server...');
    
    try {
      // Clear old cache versions first
      await clearOldCacheVersions();
      
      // Invalidate all queries to force refetch
      await queryClient.invalidateQueries();
      
      setLastSyncTime(new Date());
      console.log('Sync completed successfully');
      return true;
    } catch (error) {
      console.error('Error syncing data:', error);
      return false;
    }
  }, []);
  
  useEffect(() => {
    if (!enabled) return;
    
    const intervalId = setInterval(() => {
      syncNow();
    }, intervalMs);
    
    return () => clearInterval(intervalId);
  }, [intervalMs, enabled, syncNow]);
  
  // Perform a sync when app starts
  useEffect(() => {
    if (enabled) {
      syncNow();
    }
  }, [enabled, syncNow]);
  
  return {
    lastSyncTime,
    syncNow,
    clearCache: clearAllCachedData
  };
};

export const syncCardById = async (id: string): Promise<boolean> => {
  try {
    // Invalidate specific card query to force refetch
    await queryClient.invalidateQueries({ queryKey: ['admin-card', id] });
    return true;
  } catch (error) {
    console.error(`Error syncing card ${id}:`, error);
    return false;
  }
};
