
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import localforage from "localforage";

/**
 * Enhanced query hook that prioritizes cached data from IndexedDB and localStorage
 * for instant loading while fetching fresh data in the background.
 */
export function usePersistentQuery<TData>(
  options: UseQueryOptions<TData, Error>
) {
  // Convert query key to string for storage key
  const keyString = JSON.stringify(options.queryKey);
  
  // Try to get data from IndexedDB first, then localStorage as fallback
  const getCachedData = async (): Promise<TData | undefined> => {
    try {
      // First try IndexedDB via localforage
      const idbData = await localforage.getItem<TData>(keyString);
      if (idbData !== null) {
        console.log(`[usePersistentQuery] Found data in IndexedDB for ${keyString}`);
        return idbData;
      }
      
      // If not in IndexedDB, try localStorage
      const localStorageData = localStorage.getItem(keyString);
      if (localStorageData) {
        console.log(`[usePersistentQuery] Found data in localStorage for ${keyString}`);
        try {
          return JSON.parse(localStorageData);
        } catch (e) {
          console.warn(`[usePersistentQuery] Failed to parse localStorage data for ${keyString}`, e);
        }
      }
    } catch (e) {
      console.warn(`[usePersistentQuery] Error accessing cache for ${keyString}`, e);
    }
    return undefined;
  };
  
  // Enhanced return from the useQuery hook 
  return useQuery<TData, Error>({
    initialData: async () => {
      const cachedData = await getCachedData();
      
      if (cachedData) {
        console.log(`[usePersistentQuery] Using cached data for ${keyString}`);
        // After loading from cache, save to localStorage as backup
        try {
          localStorage.setItem(keyString, JSON.stringify(cachedData));
        } catch (e) {
          console.warn('[usePersistentQuery] Failed to save to localStorage', e);
        }
      }
      
      return cachedData;
    },
    ...options,
    // Save successful query results to both caches
    onSuccess: (data) => {
      // Call the original onSuccess if it exists
      if (options.onSuccess) {
        options.onSuccess(data);
      }
      
      // Save to IndexedDB
      localforage.setItem(keyString, data).catch(e => {
        console.warn(`[usePersistentQuery] Failed to save to IndexedDB for ${keyString}`, e);
        
        // Fallback to localStorage if IndexedDB fails
        try {
          localStorage.setItem(keyString, JSON.stringify(data));
        } catch (localStorageError) {
          console.warn(`[usePersistentQuery] Also failed to save to localStorage for ${keyString}`, localStorageError);
        }
      });
    }
  });
}
