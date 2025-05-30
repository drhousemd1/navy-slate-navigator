import { QueryClient, QueryKey, Query, Mutation, QueryCache, MutationCache } from '@tanstack/react-query';
import localforage from "localforage";
import { logger } from '@/lib/logger';

// Version identifier for cache invalidation with the persister
export const APP_CACHE_VERSION = '1.0.1'; // Incremented version

// Create a centralized QueryClient with optimized settings for persistence
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error: Error, query: Query<unknown, Error, unknown, QueryKey>) => {
        logger.error(
          `[Query Cache Error] Query Key: ${JSON.stringify(query.queryKey)} \nError:`,
          error
        );
        // Here, you could add more sophisticated error telemetry if needed in the future,
        // e.g., sending to an external logging service.
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: Error, variables: unknown, context: unknown, mutation: Mutation<unknown, Error, unknown, unknown>) => {
        logger.error(
          `[Mutation Cache Error] Mutation Key: ${JSON.stringify(mutation.options.mutationKey || 'N/A')} \nVariables: ${JSON.stringify(variables)} \nError:`,
          error,
          "\nContext:", context
        );
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: Infinity,    // Data is fresh indefinitely, relies on manual invalidation or buster
        gcTime: 1000 * 60 * 60, // Garbage collect after 1 hour of inactivity
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Components will use cached data first
        refetchOnReconnect: false,
        retry: false, // Updated: Per request, set retry to false
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        networkMode: 'online', // Default to online, persister handles offline for queries if configured
      },
      mutations: {
        networkMode: 'offlineFirst', // Queue mutations when offline
        retry: 3, // Increased retry attempts for mutations as well
        // Global onError for mutations is now handled by mutationCache
      },
    },
  });

  return queryClient;
};

// Standardized query config that can be used across pages if specific overrides are needed
// Note: The defaults in createQueryClient are now very similar to this.
export const STANDARD_QUERY_CONFIG = {
  staleTime: Infinity,
  gcTime: 1000 * 60 * 60, // 1 hour
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

// Helper function to purge the cache manually (useful for development or user actions)
export const purgeQueryCache = async (queryClient: QueryClient) => {
  queryClient.clear(); // Clears in-memory cache
  // The persister handles clearing persisted storage based on buster or manual clear of localforage
  await localforage.removeItem('REACT_QUERY_OFFLINE_CACHE'); // Default key for react-query-persist-client
  // Or, if a custom persister key is used, clear that.
  // For a full clear if unsure about the key: await localforage.clear();
  logger.debug('Query cache (in-memory and persisted via localforage) purged manually');
};

// Centralized helper for performance logging
export const logQueryPerformance = (
  operationName: string,
  startTime: number,
  dataLength?: number
) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  logger.debug(
    `[${operationName}] Operation completed in ${duration.toFixed(2)}ms` + 
    (dataLength !== undefined ? `, returned ${dataLength} items` : '')
  );
  
  if (duration > 300) {
    logger.warn(`[${operationName}] Operation was slow: ${duration.toFixed(2)}ms`);
  }
};

// Helper functions for direct cache updates (optimistic updates)
export const updateCacheItem = <T extends { id: string | number }>( // Adjusted for number IDs too
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
    // Ensure newItem is not undefined or null before adding
    return newItem ? [newItem, ...oldData] : oldData;
  });
};

export const removeCacheItem = <T extends { id: string | number }>( // Adjusted for number IDs
  queryClient: QueryClient,
  queryKey: unknown[],
  itemId: string | number
) => {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    return oldData.filter(item => item.id !== itemId);
  });
};

// --- Standardized Optimistic Mutation Hooks ---
// MOVED to src/lib/optimistic-mutations.ts
// The useCreateOptimisticMutation, useUpdateOptimisticMutation, and useDeleteOptimisticMutation
// hooks, along with OptimisticMutationContext, have been moved to a separate file
// to improve organization and reduce the size of this configuration file.
// They can be imported from '@/lib/optimistic-mutations'.
