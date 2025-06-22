
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
  const { subUserId, domUserId } = useUserIds();
  
  const { 
    data = [], 
    isLoading, 
    error,
    refetch
  } = useQuery<PunishmentData[], Error>({
    queryKey: [...PUNISHMENTS_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchPunishments(subUserId, domUserId),
    enabled: !!(subUserId || domUserId),
  });

  return {
    data,
    isLoading,
    error,
    refetch
  };
};
