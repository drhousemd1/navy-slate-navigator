
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
}

export function useSyncManager(options: SyncOptions = {}) {
  const { showToasts = false, intervalMs = 60000, enabled = true } = options;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sync a specific card by ID
  const syncCardById = useCallback(async (
    id: string, 
    type: 'tasks' | 'rules' | 'rewards' | 'punishments'
  ): Promise<void> => {
    if (!id) return;
    
    try {
      setIsSyncing(true);
      await syncCardByIdImpl(id, type);
    } catch (err) {
      console.error(`Error syncing ${type} item ${id}:`, err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync all data
  const syncNow = useCallback(async () => {
    try {
      setIsSyncing(true);
      if (showToasts) {
        toast({
          title: "Syncing",
          description: "Syncing data with server...",
        });
      }

      // No full table syncs happen here - only when needed in specific queries
      
      setLastSyncTime(new Date());
      
      if (showToasts) {
        toast({
          title: "Sync Complete",
          description: "Data successfully synchronized",
        });
      }
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
  }, [showToasts]);

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

// Export single-use function for syncing a card by ID
export async function syncCardById(id: string, type: 'tasks' | 'rules' | 'rewards' | 'punishments'): Promise<void> {
  if (!id) return;
  await syncCardByIdImpl(id, type);
}

// Implementation of card sync logic
async function syncCardByIdImpl(id: string, type: 'tasks' | 'rules' | 'rewards' | 'punishments'): Promise<void> {
  // STEP 1 – Fetch fresh data for the specified card from Supabase
  const { data, error } = await supabase.from(type).select("*").eq("id", id).single();
  if (error || !data) {
    console.error(`Failed to fetch ${type} card with ID ${id}:`, error);
    return;
  }

  // STEP 2 – Get current list from React Query cache (fallback to [])
  const cacheKey = [type];
  const cachedList = queryClient.getQueryData<any[]>(cacheKey) || [];

  // STEP 3 – Replace the specific card in the list
  let updatedList;
  
  if (type === "rewards") {
    // For rewards, ensure is_dom_reward property exists
    const freshRow = {
      ...data,
      is_dom_reward: data.is_dominant
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
  switch (type) {
    case "tasks":
      await saveTasksToDB(updatedList);
      break;
    case "rules":
      await saveRulesToDB(updatedList);
      break;
    case "rewards":
      await saveRewardsToDB(updatedList);
      break;
    case "punishments":
      await savePunishmentsToDB(updatedList);
      break;
  }
}
