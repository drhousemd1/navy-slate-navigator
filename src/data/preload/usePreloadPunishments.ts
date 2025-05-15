
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';
import type { PunishmentData } from '@/contexts/punishments/types';

export const usePreloadPunishments = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryKey = ['punishments'];
    const prefetchPunishments = async () => {
      const existingData = queryClient.getQueryData<PunishmentData[]>(queryKey);
      
      if (existingData && Array.isArray(existingData) && existingData.length > 0) {
        console.log(`Punishments data (count: ${existingData.length}) already in cache, skipping prefetch.`);
        return;
      }
      try {
        console.log('Prefetching punishments...');
        await queryClient.prefetchQuery({
          queryKey,
          queryFn: fetchPunishments,
        });
        const dataAfterPrefetch = queryClient.getQueryData<PunishmentData[]>(queryKey);
        if (dataAfterPrefetch && Array.isArray(dataAfterPrefetch)) {
            console.log(`Punishments preloaded successfully. Count: ${dataAfterPrefetch.length}`);
        } else {
            console.log('Punishments preloaded, but no data returned or data is not an array.');
        }
      } catch (error) {
        console.error('Error prefetching punishments:', error);
      }
    };
    prefetchPunishments();
  }, [queryClient]);
};
