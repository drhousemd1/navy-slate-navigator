
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { fetchRewards } from '@/data/rewards/queries/fetchRewards';
import { RULES_QUERY_KEY } from '@/data/rules/queries'; 
import { fetchRules } from '@/data/rules/fetchRules'; 
import { fetchTasks, TASKS_QUERY_KEY } from '@/data/tasks/queries';
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';
import { fetchWellbeingSnapshot, WELLBEING_QUERY_KEY } from '@/data/wellbeing/queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';

// Define necessary keys directly or import from a central query key store if available
const PUNISHMENTS_QUERY_KEY = ['punishments'];

export const usePreloadAppCoreData = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  useEffect(() => {
    const prefetchData = async () => {
      // Only prefetch if we have user IDs
      if (!subUserId && !domUserId) {
        logger.debug('[PreloadAppCoreData] No user IDs available, skipping prefetch');
        return;
      }

      logger.debug('[PreloadAppCoreData] Pre-fetching core application data...');
      
      // Rewards
      await queryClient.prefetchQuery({
        queryKey: [...REWARDS_QUERY_KEY, subUserId, domUserId],
        queryFn: () => fetchRewards(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Rewards pre-fetched.');

      // Rules
      await queryClient.prefetchQuery({
        queryKey: [...RULES_QUERY_KEY, subUserId, domUserId],
        queryFn: () => fetchRules(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Rules pre-fetched.');

      // Tasks
      await queryClient.prefetchQuery({
        queryKey: [...TASKS_QUERY_KEY, subUserId, domUserId],
        queryFn: () => fetchTasks(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Tasks pre-fetched.');

      // Punishments
      await queryClient.prefetchQuery({
        queryKey: [...PUNISHMENTS_QUERY_KEY, subUserId, domUserId],
        queryFn: () => fetchPunishments(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Punishments pre-fetched.');

      // Wellbeing data for both users
      if (subUserId) {
        await queryClient.prefetchQuery({
          queryKey: [...WELLBEING_QUERY_KEY, subUserId],
          queryFn: () => fetchWellbeingSnapshot(subUserId),
        });
        logger.debug('[PreloadAppCoreData] Sub user wellbeing pre-fetched.');
      }

      if (domUserId) {
        await queryClient.prefetchQuery({
          queryKey: [...WELLBEING_QUERY_KEY, domUserId],
          queryFn: () => fetchWellbeingSnapshot(domUserId),
        });
        logger.debug('[PreloadAppCoreData] Dom user wellbeing pre-fetched.');
      }

      logger.debug('[PreloadAppCoreData] Core data pre-fetching complete.');
    };

    if (
      !queryClient.getQueryData([...REWARDS_QUERY_KEY, subUserId, domUserId]) ||
      !queryClient.getQueryData([...RULES_QUERY_KEY, subUserId, domUserId]) ||
      !queryClient.getQueryData([...TASKS_QUERY_KEY, subUserId, domUserId]) ||
      !queryClient.getQueryData([...PUNISHMENTS_QUERY_KEY, subUserId, domUserId])
    ) {
      prefetchData();
    } else {
      logger.debug('[PreloadAppCoreData] Core data already in cache, skipping prefetch.');
    }
  }, [queryClient, subUserId, domUserId]);
};
