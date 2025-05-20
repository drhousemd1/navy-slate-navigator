
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
    staleTime: Infinity, // Data is fresh indefinitely
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false, // Controlled by sync manager
    refetchOnReconnect: false,  // Controlled by sync manager
    refetchOnMount: false,     // Controlled by sync manager
    retry: 1, 
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
  });
  
  // Simplified: Indicates if an error occurred but we are still showing data from cache.
  const isUsingCachedData = !!queryResult.error && !!queryResult.data && queryResult.data.length > 0;
  
  return {
    ...queryResult,
    isUsingCachedData
  };
};

