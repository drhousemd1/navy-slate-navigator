
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { PunishmentData } from '@/contexts/punishments/types';
import { fetchPunishments } from './fetchPunishments';
import { PUNISHMENTS_QUERY_KEY } from './index';
import { useUserIds } from '@/contexts/UserIdsContext';

// Define the PunishmentsQueryResult type
export type PunishmentsQueryResult = UseQueryResult<PunishmentData[], Error>;

export const usePunishmentsQuery = (): PunishmentsQueryResult => {
  const { subUserId, domUserId } = useUserIds();
  
  const queryResult = useQuery<PunishmentData[], Error>({
    queryKey: [...PUNISHMENTS_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchPunishments(subUserId, domUserId),
    staleTime: Infinity, 
    gcTime: 1000 * 60 * 60, 
    refetchOnWindowFocus: false, 
    refetchOnReconnect: false,  
    refetchOnMount: false,     
    retry: 1, 
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
    enabled: !!(subUserId || domUserId), // Only run if we have at least one user ID
  });
  
  return queryResult;
};
