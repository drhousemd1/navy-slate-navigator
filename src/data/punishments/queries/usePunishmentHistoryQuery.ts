
import { useQuery, QueryObserverResult } from '@tanstack/react-query';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { fetchCurrentWeekPunishmentHistory } from './fetchPunishmentHistory';
import { PUNISHMENT_HISTORY_QUERY_KEY } from './index';
import { useUserIds } from '@/contexts/UserIdsContext';

export const usePunishmentHistoryQuery = () => {
  const { subUserId, domUserId } = useUserIds();
  
  return useQuery<PunishmentHistoryItem[], Error>({
    queryKey: [...PUNISHMENT_HISTORY_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchCurrentWeekPunishmentHistory(subUserId, domUserId),
    staleTime: 1000 * 60 * 5, // 5 minutes, as it's not preloaded by usePreloadAppCoreData
    refetchOnWindowFocus: false, // Typically false for less aggressive fetching
    refetchOnMount: true, // Fetch when component mounts if data is stale
    enabled: !!(subUserId || domUserId), // Only run if we have at least one user ID
  });
};
