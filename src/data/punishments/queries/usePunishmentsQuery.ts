
import { useQuery, QueryObserverResult, UseQueryResult } from '@tanstack/react-query';
import { PunishmentData } from '@/contexts/punishments/types';
import { fetchPunishments } from './fetchPunishments';
import { PUNISHMENTS_QUERY_KEY } from './index';

// Define the PunishmentsQueryResult type
export type PunishmentsQueryResult = UseQueryResult<PunishmentData[], Error> & {
  isUsingCachedData: boolean;
};

export const usePunishmentsQuery = (): PunishmentsQueryResult => {
  const queryResult = useQuery<PunishmentData[], Error>({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: 1000 * 60 * 5, // Stale after 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: true, // Standard practice
    refetchOnReconnect: true,
    refetchOnMount: true, 
    retry: 1, // Retry once on failure
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000), // Exponential backoff with max of 10s
  });
  
  const isUsingCachedData =
    (!!queryResult.error && queryResult.data && queryResult.data.length > 0) ||
    (queryResult.isStale && queryResult.fetchStatus === 'idle' && queryResult.data && queryResult.data.length > 0 && queryResult.errorUpdateCount > 0);
  
  return {
    ...queryResult,
    isUsingCachedData
  };
};
