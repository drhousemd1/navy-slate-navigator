
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

// Create a centralized QueryClient with optimized settings
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
        gcTime: 1000 * 60 * 30,    // Keep cache for 30 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: true,     // Refetch when component mounts
        refetchOnReconnect: true,  // Refetch when reconnecting
        retry: 3,                  // Increase retry attempts for network issues
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        networkMode: 'online',
      },
      mutations: {
        networkMode: 'online',
        retry: 2,                  // Allow mutation retries
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
      
      // Store the cache manually with versioning
      queryClient.mount(); // Ensure client is initialized
      
      // Add event listener to save cache before page unload
      window.addEventListener('beforeunload', () => {
        try {
          const state = queryClient.getQueryCache().getAll().map(query => ({
            queryKey: query.queryKey,
            data: query.state.data,
            dataUpdatedAt: query.state.dataUpdatedAt,
          }));
          
          if (state.length > 0) {
            // Add version and timestamp to cache for later comparison
            const cacheData = {
              version: parseInt(localStorage.getItem('app-data-version') || '0'),
              timestamp: Date.now(),
              queries: state
            };
            
            localStorage.setItem(storageKey, JSON.stringify(cacheData));
            console.log(`Saved ${state.length} queries to localStorage with version ${cacheData.version}`);
          }
        } catch (e) {
          console.error("Error saving query cache:", e);
        }
      });
      
      // Try to restore cache on initialization but check versions
      try {
        const savedCache = localStorage.getItem(storageKey);
        if (savedCache) {
          const cacheData = JSON.parse(savedCache);
          const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
          const cacheVersion = cacheData.version || 0;
          
          // Only restore cache if versions match and cache is recent
          const maxCacheAge = 1000 * 60 * 30; // 30 minutes
          const cacheAge = Date.now() - (cacheData.timestamp || 0);
          
          if (cacheVersion === currentVersion && cacheAge < maxCacheAge) {
            // Cache is valid, restore it
            const queries = cacheData.queries || [];
            queries.forEach(item => {
              if (item.queryKey && item.data !== undefined) {
                queryClient.setQueryData(item.queryKey, item.data);
              }
            });
            console.log(`Restored ${queries.length} queries from localStorage with version ${cacheVersion}`);
          } else {
            console.log(`Cache version mismatch or cache too old: cache=${cacheVersion}, current=${currentVersion}, age=${cacheAge}ms`);
            // Invalidate cache but don't remove it yet
            queryClient.clear();
          }
        }
      } catch (e) {
        console.error("Error restoring query cache:", e);
        queryClient.clear();
      }
      
      console.log("Manual query persistence configured with version tracking");
    } catch (e) {
      console.error("Error setting up query persistence:", e);
      // Fallback to non-persistent client if setup fails
    }
  }
  
  return queryClient;
};

// Updated query config to avoid infinite caching
export const STANDARD_QUERY_CONFIG = {
  staleTime: 1000 * 60 * 5,  // Consider data fresh for 5 minutes
  gcTime: 1000 * 60 * 30,    // Keep cache for 30 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: true,      // Changed to true to fetch on mount
  refetchOnReconnect: true,  // Changed to true to fetch on reconnect
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  keepPreviousData: true,
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
    // Trigger a background refresh with shorter stale time
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
