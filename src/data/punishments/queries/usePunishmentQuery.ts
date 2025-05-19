
import { useQuery } from '@tanstack/react-query';
import { PunishmentData } from '@/contexts/punishments/types';
import { fetchPunishmentById } from './fetchPunishmentById';
import { PUNISHMENTS_QUERY_KEY } from './index';

export const usePunishmentQuery = (punishmentId: string | undefined) => {
  return useQuery<PunishmentData | null, Error>({
    queryKey: [...PUNISHMENTS_QUERY_KEY, punishmentId],
    queryFn: () => {
      if (!punishmentId) {
        // Return null or throw an error if punishmentId is undefined,
        // or handle as per application logic (e.g., for a "create new" case).
        // For query purposes, returning Promise<null> if disabled/no ID.
        return Promise.resolve(null);
      }
      return fetchPunishmentById(punishmentId);
    },
    enabled: !!punishmentId, // Only run the query if punishmentId is provided
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false, // Ensure retry is false as per global config
  });
};
