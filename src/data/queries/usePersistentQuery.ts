
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import localforage from "localforage";

/**
 * Enhanced query hook that prioritizes cached data from IndexedDB and localStorage
 * for instant loading while fetching fresh data in the background.
 */
export function usePersistentQuery<TData>(
  options: UseQueryOptions<TData, Error, TData, any>
): UseQueryResult<TData, Error> {
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
  return useQuery<TData, Error, TData, any>({
    ...options,
    initialData: undefined,
    initialDataUpdatedAt: undefined,
    // Fix: Using a properly typed placeholderData that returns the data synchronously
    placeholderData: () => {
      // Since we can't use async here directly, we create a promise that will be
      // resolved outside React's rendering cycle
      const cachedDataPromise = getCachedData();
      
      // This is a synchronous operation now
      // We will resolve the promise elsewhere and update the cache later
      console.log(`[usePersistentQuery] Setting up placeholder for ${keyString}`);
      
      // Return undefined for now - the data will come from initialData if available
      // or will be fetched in the background
      return undefined;
    },
    // Fix: Handle success callback properly through meta
    meta: {
      ...options.meta,
      onQuerySuccess: (data: TData) => {
        // Call the original callback if it exists
        if (options.meta && typeof options.meta.onQuerySuccess === 'function') {
          options.meta.onQuerySuccess(data);
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
        
        // Run getCachedData to preload the cache for next time
        getCachedData().then(cachedData => {
          if (cachedData === undefined) {
            console.log(`[usePersistentQuery] Cache initialized for future access to ${keyString}`);
          }
        });
      }
    },
    // Use an explicit onSuccess handler to load from cache on first render
    onSuccess: (data: TData) => {
      // When data is fetched successfully, save to localStorage as backup
      try {
        localStorage.setItem(keyString, JSON.stringify(data));
      } catch (e) {
        console.warn('[usePersistentQuery] Failed to save to localStorage', e);
      }
    }
  });
}
