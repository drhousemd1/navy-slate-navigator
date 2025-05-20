
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { PunishmentData } from '@/contexts/punishments/types';
import { fetchPunishments } from './fetchPunishments';
import { PUNISHMENTS_QUERY_KEY } from './index';

// Define the PunishmentsQueryResult type, removing isUsingCachedData
export type PunishmentsQueryResult = UseQueryResult<PunishmentData[], Error>;

export const usePunishmentsQuery = (): PunishmentsQueryResult => {
  const queryResult = useQuery<PunishmentData[], Error>({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: Infinity, 
    gcTime: 1000 * 60 * 60, 
    refetchOnWindowFocus: false, 
    refetchOnReconnect: false,  
    refetchOnMount: false,     
    retry: 1, 
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
  });
  
  // isUsingCachedData is removed as banners are removed.
  // The presence of `data` alongside `error` implicitly means cached data is shown during a sync error.
  
  return queryResult;
};

