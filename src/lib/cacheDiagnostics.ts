
import { QueryClient, QueryCache, MutationCache, QueryCacheNotifyEvent } from '@tanstack/react-query'; // Added QueryCacheNotifyEvent
import { logger } from './logger';
import { getErrorMessage } from './errors';

interface CacheEntryData {
  queryKey: unknown[];
  data?: unknown;
  // Add other relevant fields from Query or Mutation objects if needed
  // For example, for mutations:
  // mutationId?: number;
  // state?: { data?: unknown; error?: unknown; status?: string; };
}

// The following functions were referenced by CacheMonitorPanel.tsx but seem to have been removed or changed.
// If they are needed, they would need to be re-implemented or restored.
// For now, their absence will cause build errors if CacheMonitorPanel.tsx is not updated.
/*
export const getInMemoryCacheStatus = (queryClient: QueryClient) => { ... };
export const getPersistedReactQueryCacheInfo = async () => { ... };
export const listLocalForageKeysForReactQueryStore = async () => { ... };
export const getTotalSizeOfReactQueryLocalForageStore = async () => { ... };
export const clearAllAppCache = async (queryClient: QueryClient) => { ... };
export const clearInMemoryCache = (queryClient: QueryClient) => { ... };
*/


export const logCacheState = (queryClient: QueryClient) => {
  try {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll().map(q => ({
      queryKey: q.queryKey,
      data: q.state.data,
      // status: q.state.status,
      // dataUpdatedAt: q.state.dataUpdatedAt,
    })) as CacheEntryData[]; 

    logger.debug("Current Query Cache State:", queries);

    const mutationCache = queryClient.getMutationCache();
    const mutations = mutationCache.getAll().map(m => ({
      mutationKey: m.options.mutationKey, 
      // variables: m.state.variables,
      // status: m.state.status,
      // data: m.state.data,
      // error: m.state.error,
    })) as Partial<CacheEntryData>[]; 
    logger.debug("Current Mutation Cache State:", mutations);
  } catch (error: unknown) {
    logger.error("Error logging cache state:", getErrorMessage(error), error);
  }
};

// Example of subscribing to cache events (ensure QueryCacheNotifyEvent is imported)
export const setupCacheEventLogging = (queryClient: QueryClient) => {
  const queryCache = queryClient.getQueryCache();
  queryCache.subscribe((event: QueryCacheNotifyEvent) => { // Typed event
    logger.debug("Query Cache Event:", event);
  });

  const mutationCache = queryClient.getMutationCache();
  mutationCache.subscribe((event: any) => { // TODO: Find the correct type for MutationCacheEvent if available
    logger.debug("Mutation Cache Event:", event);
  });
};

