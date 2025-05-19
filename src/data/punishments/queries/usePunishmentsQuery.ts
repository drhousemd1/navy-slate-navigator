
import { useQuery, QueryObserverResult } from '@tanstack/react-query';
import { PunishmentData } from '@/contexts/punishments/types';
import { fetchPunishments } from './fetchPunishments';
import { PUNISHMENTS_QUERY_KEY } from './index'; // Assuming PUNISHMENTS_QUERY_KEY is exported from index

export const usePunishmentsQuery = () => {
  return useQuery<PunishmentData[], Error>({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
