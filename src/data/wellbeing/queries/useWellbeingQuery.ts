import { useQuery } from '@tanstack/react-query';
import { fetchWellbeingSnapshot } from './fetchWellbeingSnapshot';
import { WellbeingSnapshot } from '../types';
import { logger } from '@/lib/logger';

export const WELLBEING_QUERY_KEY = ['wellbeing'];

export const useWellbeingQuery = (userId: string | null) => {
  return useQuery<WellbeingSnapshot | null, Error>({
    queryKey: [...WELLBEING_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) {
        logger.debug('[useWellbeingQuery] No userId provided, returning null');
        return Promise.resolve(null);
      }
      return fetchWellbeingSnapshot(userId);
    },
    enabled: !!userId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: false,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};