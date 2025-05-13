
import { QueryClient } from '@tanstack/react-query';
import localforage from 'localforage';
import { 
  loadTasksFromDB,
  loadRulesFromDB,
  loadRewardsFromDB,
  loadPunishmentsFromDB
} from '@/data/indexedDB/useIndexedDB';
import { 
  currentWeekKey, 
  todayKey,
  resetTaskCompletions 
} from '@/lib/taskUtils';

// Keys for our query cache
const TASKS_KEY = 'tasks';
const RULES_KEY = 'rules';
const REWARDS_KEY = 'rewards';
const PUNISHMENTS_KEY = 'punishments';

/**
 * Centralized preloading utility that loads all data from IndexedDB
 * and populates the React Query cache for instant loading
 */
export const preloadAllData = async (queryClient: QueryClient): Promise<void> => {
  console.log('[preloadAllData] Starting preload of all data...');
  const startTime = performance.now();
  
  try {
    // Check if we need to reset daily tasks
    if (localStorage.getItem("lastDaily") !== todayKey()) {
      await resetTaskCompletions("daily");
      localStorage.setItem("lastDaily", todayKey());
      console.log('[preloadAllData] Daily tasks reset complete');
    }
    
    // Check if we need to reset weekly tasks
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekKey());
      console.log('[preloadAllData] Weekly tasks reset complete');
    }
    
    // Load all data in parallel
    const [tasks, rules, rewards, punishments] = await Promise.all([
      loadTasksFromDB(),
      loadRulesFromDB(),
      loadRewardsFromDB(),
      loadPunishmentsFromDB()
    ]);
    
    // Update React Query cache for each data type
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      queryClient.setQueryData(['tasks'], tasks);
      console.log(`[preloadAllData] Preloaded ${tasks.length} tasks into cache`);
    }
    
    if (rules && Array.isArray(rules) && rules.length > 0) {
      queryClient.setQueryData(['rules'], rules);
      console.log(`[preloadAllData] Preloaded ${rules.length} rules into cache`);
    }
    
    if (rewards && Array.isArray(rewards) && rewards.length > 0) {
      // Ensure rewards have the right structure
      const processedRewards = rewards.map(reward => ({
        ...reward,
        is_dom_reward: reward.is_dominant ?? false
      }));
      queryClient.setQueryData(['rewards'], processedRewards);
      console.log(`[preloadAllData] Preloaded ${processedRewards.length} rewards into cache`);
    }
    
    if (punishments && Array.isArray(punishments) && punishments.length > 0) {
      queryClient.setQueryData(['punishments'], punishments);
      console.log(`[preloadAllData] Preloaded ${punishments.length} punishments into cache`);
    }
    
    const endTime = performance.now();
    console.log(`[preloadAllData] Preload complete in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('[preloadAllData] Error preloading data:', error);
  }
};

/**
 * Helper function to manually update cache to ensure 
 * consistency between IndexedDB and the ReactQuery cache
 */
export const updateDataCache = async <T>(
  queryClient: QueryClient, 
  queryKey: string[], 
  data: T[]
): Promise<void> => {
  try {
    // Update React Query cache
    queryClient.setQueryData(queryKey, data);
    
    // Update IndexedDB
    const keyString = JSON.stringify(queryKey);
    await localforage.setItem(keyString, data);
    
    // Also update localStorage as fallback
    try {
      localStorage.setItem(keyString, JSON.stringify(data));
    } catch (e) {
      console.warn(`[updateDataCache] Failed to update localStorage for ${keyString}`, e);
    }
    
    console.log(`[updateDataCache] Updated cache for ${queryKey[0]}, ${data.length} items`);
  } catch (error) {
    console.error(`[updateDataCache] Error updating cache for ${queryKey[0]}:`, error);
  }
};
