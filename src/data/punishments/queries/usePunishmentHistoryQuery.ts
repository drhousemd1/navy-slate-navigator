
import { useQuery, QueryObserverResult } from '@tanstack/react-query';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { fetchCurrentWeekPunishmentHistory } from './fetchPunishmentHistory';
import { PUNISHMENT_HISTORY_QUERY_KEY } from './index'; // Assuming PUNISHMENT_HISTORY_QUERY_KEY is exported from index

export const usePunishmentHistoryQuery = () => {
  return useQuery<PunishmentHistoryItem[], Error>({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchCurrentWeekPunishmentHistory,
    staleTime: 1000 * 60 * 5, // 5 minutes, as it's not preloaded by usePreloadAppCoreData
    refetchOnWindowFocus: false, // Typically false for less aggressive fetching
    refetchOnMount: true, // Fetch when component mounts if data is stale
  });
};
