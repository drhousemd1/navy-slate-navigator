
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

// Create a centralized QueryClient with optimized settings for infinite caching
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity, // Cache data forever, never consider it stale
        gcTime: Infinity,    // Never garbage collect the cache
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 3,            // Increase retry attempts for network issues
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        networkMode: 'online',
      },
      mutations: {
        networkMode: 'online',
        retry: 2,            // Allow mutation retries
      },
    },
  });

  return queryClient;
};

// Create a persisted query client that preserves the cache between page refreshes
export const createPersistedQueryClient = () => {
  const queryClient = createQueryClient();
  
  // Only setup persistence in browser environments
  if (typeof window !== 'undefined') {
    try {
      // Create a simplified persister without custom serialization
      const storageKey = 'kingdom-app-cache';
      
      // Store the cache manually instead of using the problematic persistQueryClient
      // This avoids the type conflict while still maintaining persistence
      queryClient.mount(); // Ensure client is initialized
      
      // Add event listener to save cache before page unload
      window.addEventListener('beforeunload', () => {
        try {
          const state = queryClient.getQueryCache().getAll().map(query => ({
            queryKey: query.queryKey,
            data: query.state.data,
          }));
          
          if (state.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(state));
            console.log(`Saved ${state.length} queries to localStorage`);
          }
        } catch (e) {
          console.error("Error saving query cache:", e);
        }
      });
      
      // Try to restore cache on initialization
      try {
        const savedCache = localStorage.getItem(storageKey);
        if (savedCache) {
          const queries = JSON.parse(savedCache);
          queries.forEach(item => {
            if (item.queryKey && item.data !== undefined) {
              queryClient.setQueryData(item.queryKey, item.data);
            }
          });
          console.log(`Restored ${queries.length} queries from localStorage`);
        }
      } catch (e) {
        console.error("Error restoring query cache:", e);
      }
      
      console.log("Manual query persistence configured");
    } catch (e) {
      console.error("Error setting up query persistence:", e);
      // Fallback to non-persistent client if setup fails
    }
  }
  
  return queryClient;
};

// Standardized query config that should be used across ALL pages in the app
export const STANDARD_QUERY_CONFIG = {
  staleTime: Infinity,  // Cache data forever, never consider it stale
  gcTime: Infinity,     // Never garbage collect the cache
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 3,             // Increased retry count
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  keepPreviousData: true, // Show previous data while fetching
};

// Centralized helper for performance logging
export const logQueryPerformance = (
  operationName: string,
  startTime: number,
  dataLength?: number
) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(
    `[${operationName}] Operation completed in ${duration.toFixed(2)}ms` + 
    (dataLength !== undefined ? `, returned ${dataLength} items` : '')
  );
  
  // Log warnings for slow operations
  if (duration > 300) {
    console.warn(`[${operationName}] Operation was slow: ${duration.toFixed(2)}ms`);
  }
};

// Helper functions for direct cache updates
export const updateCacheItem = <T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updatedItem: T
) => {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    return oldData.map(item => (item.id === updatedItem.id ? updatedItem : item));
  });
};

export const addCacheItem = <T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  newItem: T
) => {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    return [newItem, ...oldData];
  });
};

export const removeCacheItem = <T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  itemId: string
) => {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    return oldData.filter(item => item.id !== itemId);
  });
};

// Add a function to display cached data when available but also update in background
export const useCachedQuery = (queryClient: QueryClient, queryKey: unknown[], queryFn: () => Promise<any>) => {
  // Check if we have cached data
  const cachedData = queryClient.getQueryData(queryKey);
  
  // If we have cached data, return it immediately but also refresh in background
  if (cachedData) {
    // Trigger a background refresh
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 60000, // Consider it fresh for 1 minute
    });
    
    return cachedData;
  }
  
  // If no cached data, fetch normally
  return null; // This will show loading state
};
