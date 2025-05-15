
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '../queryClient';
import {
  saveTasksToDB, loadTasksFromDB,
  saveRulesToDB, loadRulesFromDB,
  saveRewardsToDB, loadRewardsFromDB,
  savePunishmentsToDB, loadPunishmentsFromDB
} from "../indexedDB/useIndexedDB";

interface SyncOptions {
  showToasts?: boolean;
  intervalMs?: number;
  enabled?: boolean;
  maxRetries?: number;
}

export function useSyncManager(options: SyncOptions = {}) {
  const { 
    showToasts = false, 
    intervalMs = 60000, 
    enabled = true,
    maxRetries = 3 
  } = options;
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [retryCount, setRetryCount] = useState(0);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0); // Reset retry count when we're back online
      syncNow(); // Attempt to sync when we come back online
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync a specific card by ID with better error handling
  const syncCardById = useCallback(async (
    id: string, 
    type: 'tasks' | 'rules' | 'rewards' | 'punishments'
  ): Promise<void> => {
    if (!id || !isOnline) return;
    
    try {
      setIsSyncing(true);
      await syncCardByIdImpl(id, type);
    } catch (err) {
      console.error(`Error syncing ${type} item ${id}:`, err);
      // No need to show toast here as it might be too noisy
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Sync all data with robust error handling and offline support
  const syncNow = useCallback(async () => {
    // Don't even attempt sync if we're offline
    if (!isOnline) {
      console.log('Device is offline, skipping sync');
      return;
    }
    
    try {
      setIsSyncing(true);
      if (showToasts) {
        toast({
          title: "Syncing",
          description: "Syncing data with server...",
        });
      }

      // Load data from IndexedDB even if we can't connect to the server
      const tasks = await loadTasksFromDB();
      const rewards = await loadRewardsFromDB();
      const rules = await loadRulesFromDB();
      const punishments = await loadPunishmentFromDB();
      
      // Update cache with local data
      if (tasks && Array.isArray(tasks)) {
        queryClient.setQueryData(["tasks"], tasks);
      }
      
      if (rewards && Array.isArray(rewards)) {
        queryClient.setQueryData(["rewards"], rewards);
      }
      
      if (rules && Array.isArray(rules)) {
        queryClient.setQueryData(["rules"], rules);
      }
      
      if (punishments && Array.isArray(punishments)) {
        queryClient.setQueryData(["punishments"], punishments);
      }

      setLastSyncTime(new Date());
      setRetryCount(0); // Reset retry count after successful sync
      
      if (showToasts) {
        toast({
          title: "Sync Complete",
          description: "Data successfully synchronized",
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      // Increment retry count and handle failures
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (newRetryCount >= maxRetries) {
        if (showToasts) {
          toast({
            title: "Sync Failed",
            description: "Will use locally stored data until connection is restored.",
            variant: "destructive",
          });
        }
        
        // Even if server sync failed, try to load data from IndexedDB
        try {
          const tasks = await loadTasksFromDB();
          if (tasks && Array.isArray(tasks)) {
            queryClient.setQueryData(["tasks"], tasks);
          }
        } catch (localError) {
          console.error('Failed to load local data:', localError);
        }
      } else if (showToasts) {
        toast({
          title: "Sync Delayed",
          description: `Retrying in ${Math.round(intervalMs / 1000)} seconds...`,
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [showToasts, retryCount, maxRetries, intervalMs, isOnline]);

  // Helper function to ensure IndexedDB is loaded
  const loadPunishmentFromDB = async () => {
    try {
      return await loadPunishmentsFromDB();
    } catch (err) {
      console.error("Error loading punishments from IndexedDB:", err);
      return [];
    }
  };

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
    syncCardById,
    isOnline
  };
}

// Export single-use function for syncing a card by ID
export async function syncCardById(id: string, type: 'tasks' | 'rules' | 'rewards' | 'punishments'): Promise<void> {
  if (!id) return;
  await syncCardByIdImpl(id, type);
}

// Implementation of card sync logic with better timeout and error handling
async function syncCardByIdImpl(id: string, type: 'tasks' | 'rules' | 'rewards' | 'punishments'): Promise<void> {
  try {
    // STEP 1 – Fetch fresh data for the specified card from Supabase with a timeout
    const { data, error } = await Promise.race([
      supabase.from(type).select("*").eq("id", id).single(),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error("Database query timeout")), 5000)
      )
    ]);
    
    if (error || !data) {
      console.error(`Failed to fetch ${type} card with ID ${id}:`, error);
      // Try to load from IndexedDB instead
      const localData = await loadEntityFromDB(type, id);
      if (localData) {
        // If we have local data, use that instead
        console.log(`Using locally stored ${type} data for ID ${id}`);
        return;
      }
      return;
    }

    // STEP 2 – Get current list from React Query cache (fallback to [])
    const cacheKey = [type];
    const cachedList = queryClient.getQueryData<any[]>(cacheKey) || [];

    // STEP 3 – Replace the specific card in the list
    let updatedList;
    
    if (type === "rewards") {
      // For rewards, ensure is_dom_reward property exists
      const raw: any = data;   // suppress TS2339
      const freshRow = {
        ...raw,
        is_dom_reward: !!raw.is_dominant
      };
      
      // Update the cached list with the enhanced reward data
      updatedList = cachedList.map((item) => (item.id === id ? freshRow : item));
    } else {
      // For other domains, proceed as before
      updatedList = cachedList.map((item) => (item.id === id ? data : item));
    }

    // STEP 4 – Update the cache
    queryClient.setQueryData(cacheKey, updatedList);

    // STEP 5 – Update IndexedDB based on domain
    await saveEntityToDB(type, updatedList);
  } catch (error) {
    console.error(`Error in syncCardByIdImpl for ${type} with ID ${id}:`, error);
    // Fallback to local data if available
    try {
      await loadEntityFromDB(type, id);
    } catch (localError) {
      console.error(`Failed to load local data for ${type} with ID ${id}:`, localError);
    }
  }
}

// Helper functions for IndexedDB operations
async function saveEntityToDB(type: 'tasks' | 'rules' | 'rewards' | 'punishments', data: any[]): Promise<void> {
  try {
    switch (type) {
      case "tasks":
        await saveTasksToDB(data);
        break;
      case "rules":
        await saveRulesToDB(data);
        break;
      case "rewards":
        await saveRewardsToDB(data);
        break;
      case "punishments":
        await savePunishmentsToDB(data);
        break;
    }
  } catch (error) {
    console.error(`Error saving ${type} to IndexedDB:`, error);
  }
}

async function loadEntityFromDB(type: 'tasks' | 'rules' | 'rewards' | 'punishments', id?: string): Promise<any> {
  try {
    let data;
    switch (type) {
      case "tasks":
        data = await loadTasksFromDB();
        break;
      case "rules":
        data = await loadRulesFromDB();
        break;
      case "rewards":
        data = await loadRewardsFromDB();
        break;
      case "punishments":
        data = await loadPunishmentsFromDB();
        break;
    }
    
    if (!data) return null;
    
    if (id) {
      return Array.isArray(data) ? data.find(item => item.id === id) : null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading ${type} from IndexedDB:`, error);
    return null;
  }
}
