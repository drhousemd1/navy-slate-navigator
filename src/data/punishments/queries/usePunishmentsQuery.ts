import { captureCacheToken, legacyQueryKey } from '@/data/indexedDB/useIndexedDB';

import { useQuery } from '@tanstack/react-query';
import { PunishmentData } from '@/contexts/punishments/types';
import { PUNISHMENTS_QUERY_KEY } from './index';
import { fetchPunishments } from './fetchPunishments';
import { useUserIds } from '@/contexts/UserIdsContext';

export type PunishmentsQueryResult = {
  data: PunishmentData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export const usePunishmentsQuery = (): PunishmentsQueryResult => {
  const cacheToken = captureCacheToken();
  const { subUserId, domUserId } = useUserIds();

  const {
    data = [],
    isLoading,
    error,
    refetch
  } = useQuery<PunishmentData[], Error>({
    queryKey: legacyQueryKey(PUNISHMENTS_QUERY_KEY, cacheToken),
    queryFn: () => fetchPunishments(subUserId, domUserId, cacheToken),
    enabled: !!(subUserId || domUserId),
  });

  return {
    data,
    isLoading,
    error,
    refetch
  };
};
