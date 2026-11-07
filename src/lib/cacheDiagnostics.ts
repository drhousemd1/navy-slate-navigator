import { QueryClient } from '@tanstack/react-query';
import { queryClient as appQueryClient } from '@/data/queryClient';
import { purgeQueryCache } from '@/lib/react-query-config'; // For clearing cache
import { logger } from '@/lib/logger';

// No React Query disk persister is mounted. Legacy bytes are unattributable.

interface InMemoryCacheStatus {
  totalQueries: number;
  // We could add more details if QueryClient's API allows easy access,
  // e.g., number of active queries, observers, etc.
}

/**
 * Gets statistics about the in-memory React Query cache.
 * @param client - The QueryClient instance (defaults to the app's global queryClient).
 * @returns An object with in-memory cache statistics.
 */
export const getInMemoryCacheStatus = (client: QueryClient = appQueryClient): InMemoryCacheStatus => {
  const cache = client.getQueryCache();
  return {
    totalQueries: cache.findAll().length,
  };
};

interface PersistedCacheInfo {
  exists: boolean;
  sizeBytes: number | null;
  lastPersistedTimestamp: number | null; // Timestamp from the persisted client state structure
  data?: unknown; // Optionally include the raw persisted data for inspection
}

/** Compatibility for the unmounted diagnostics panel: no active disk persister.
 * Unknown legacy blobs are neither inspected nor displayed as current data. */
export const getPersistedReactQueryCacheInfo = async (_includeData = false): Promise<PersistedCacheInfo> => ({ exists: false, sizeBytes: null, lastPersistedTimestamp: null });
export const listLocalForageKeysForReactQueryStore = async (): Promise<string[]> => [];
export const getTotalSizeOfReactQueryLocalForageStore = async (): Promise<number> => 0;

/**
 * Clears in-memory queries only; legacy and durable disk data remain untouched.
 * This re-uses the function from react-query-config.
 */
export const clearAllAppCache = async (): Promise<void> => {
  await purgeQueryCache(appQueryClient);
  logger.debug('In-memory queries cleared; disk data and pending mutations preserved.');
};

/**
 * Clears only the in-memory React Query cache.
 */
export const clearInMemoryCache = (client: QueryClient = appQueryClient): void => {
  client.getQueryCache().clear(); // Clears all queries from the cache
  logger.debug('In-memory cache cleared.');
};
