
import { QueryClient } from '@tanstack/react-query';

// Create a centralized QueryClient with optimized settings for infinite caching
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity, // Cache data forever, never consider it stale
        gcTime: Infinity,    // Never garbage collect the cache
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 1,
        networkMode: 'online',
      },
      mutations: {
        networkMode: 'online',
        retry: 1,
      },
    },
  });
};

// Standardized query config that can be used across the app
export const STANDARD_QUERY_CONFIG = {
  staleTime: Infinity,  // Cache data forever, never consider it stale
  gcTime: Infinity,     // Never garbage collect the cache
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 1,
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
