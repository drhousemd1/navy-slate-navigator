import { QueryClient } from '@tanstack/react-query';
import localforage from 'localforage';
import { queryClient as appQueryClient } from '@/data/queryClient';
import { purgeQueryCache } from '@/lib/react-query-config'; // For clearing cache
import { logger } from '@/lib/logger';

// localforage is configured in App.tsx with:
// name: 'kingdom-app-react-query', storeName: 'query_cache'
// This module will use that globally configured instance.

const PERSISTED_CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE'; // Default key used by react-query-persist-client

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
  data?: any; // Optionally include the raw persisted data for inspection
}

/**
 * Gets information about the persisted React Query cache stored in localforage.
 * It specifically looks for the 'REACT_QUERY_OFFLINE_CACHE' key.
 * @param includeData - Whether to include the raw persisted data in the result.
 * @returns A promise that resolves to an object with persisted cache information.
 */
export const getPersistedReactQueryCacheInfo = async (includeData: boolean = false): Promise<PersistedCacheInfo> => {
  try {
    // localforage.getItem will use the instance configured in App.tsx
    const persistedClientData = await localforage.getItem<any>(PERSISTED_CACHE_KEY);

    if (!persistedClientData) {
      return {
        exists: false,
        sizeBytes: null,
        lastPersistedTimestamp: null,
      };
    }

    const sizeBytes = new TextEncoder().encode(JSON.stringify(persistedClientData)).length;
    // The persisted data typically has a structure like { timestamp: number, clientState: ... }
    const lastPersistedTimestamp = persistedClientData?.timestamp || null;

    return {
      exists: true,
      sizeBytes,
      lastPersistedTimestamp,
      ...(includeData && { data: persistedClientData }),
    };
  } catch (error) {
    logger.error("Error fetching persisted React Query cache info:", error);
    return {
      exists: false,
      sizeBytes: null,
      lastPersistedTimestamp: null,
    };
  }
};

/**
 * Lists all keys within the localforage store configured for React Query.
 * (As configured in App.tsx: name 'kingdom-app-react-query', storeName 'query_cache')
 * @returns A promise that resolves to an array of keys.
 */
export const listLocalForageKeysForReactQueryStore = async (): Promise<string[]> => {
  try {
    // This targets the 'kingdom-app-react-query/query_cache' IndexedDB store
    return await localforage.keys();
  } catch (error) {
    logger.error("Error listing localforage keys for React Query store:", error);
    return [];
  }
};

/**
 * Calculates the total size of all items in the localforage store configured for React Query.
 * @returns A promise that resolves to the total size in bytes.
 */
export const getTotalSizeOfReactQueryLocalForageStore = async (): Promise<number> => {
  let totalSize = 0;
  try {
    const keys = await localforage.keys(); // Keys from 'kingdom-app-react-query/query_cache'
    for (const key of keys) {
      const item = await localforage.getItem(key);
      if (item) {
        totalSize += new TextEncoder().encode(JSON.stringify(item)).length;
      }
    }
    return totalSize;
  } catch (error) {
    logger.error("Error calculating total size of React Query localforage store:", error);
    return 0;
  }
};

/**
 * Clears all caches (in-memory and persisted React Query cache).
 * This re-uses the function from react-query-config.
 */
export const clearAllAppCache = async (): Promise<void> => {
  await purgeQueryCache(appQueryClient);
  logger.debug('All app cache (in-memory and persisted) cleared via cacheDiagnostics.');
};

/**
 * Clears only the in-memory React Query cache.
 */
export const clearInMemoryCache = (client: QueryClient = appQueryClient): void => {
  client.getQueryCache().clear(); // Clears all queries from the cache
  client.getMutationCache().clear(); // Clears all mutations from the cache
  logger.debug('In-memory cache cleared.');
};
