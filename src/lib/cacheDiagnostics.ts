import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
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

export const logCacheState = (queryClient: QueryClient) => {
  try {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll().map(q => ({
      queryKey: q.queryKey,
      data: q.state.data,
      // status: q.state.status,
      // dataUpdatedAt: q.state.dataUpdatedAt,
    })) as CacheEntryData[]; // Cast to CacheEntryData array

    logger.debug("Current Query Cache State:", queries);

    const mutationCache = queryClient.getMutationCache();
    const mutations = mutationCache.getAll().map(m => ({
      mutationKey: m.options.mutationKey, // or some identifier if available
      // variables: m.state.variables,
      // status: m.state.status,
      // data: m.state.data,
      // error: m.state.error,
    })) as Partial<CacheEntryData>[]; // Cast appropriately
    logger.debug("Current Mutation Cache State:", mutations);
  } catch (error: unknown) {
    logger.error("Error logging cache state:", getErrorMessage(error), error);
  }
};

// You can also set up event logging for cache changes
// This is more verbose but can be useful for debugging
// queryCache.subscribe((event) => {
//   logger.debug("Query Cache Event:", event);
// });

// mutationCache.subscribe((event) => {
//   logger.debug("Mutation Cache Event:", event);
// });
