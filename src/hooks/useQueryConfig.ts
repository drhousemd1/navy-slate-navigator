
import { QueryKey, UseQueryOptions } from '@tanstack/react-query';

// Default stale time of 5 minutes
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

// Default cache time of 10 minutes
export const DEFAULT_CACHE_TIME = 10 * 60 * 1000;

export function useQueryConfig<TData>(
  key: QueryKey,
  options?: Partial<UseQueryOptions<TData>>
): UseQueryOptions<TData> {
  return {
    staleTime: DEFAULT_STALE_TIME,
    cacheTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  };
}
