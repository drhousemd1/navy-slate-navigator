
import { QueryKey, UseQueryOptions } from '@tanstack/react-query';

// Default stale time of 5 minutes
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

// Default garbage collection time of 10 minutes
export const DEFAULT_GC_TIME = 10 * 60 * 1000;

export function useQueryConfig<TData>(
  key: QueryKey,
  options?: Partial<UseQueryOptions<TData>>
): Partial<UseQueryOptions<TData>> {
  return {
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  };
}
