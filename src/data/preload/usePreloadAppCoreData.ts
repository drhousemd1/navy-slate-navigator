import { captureCacheToken, legacyQueryKey } from '@/data/indexedDB/useIndexedDB';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { fetchRewards } from '@/data/rewards/queries/fetchRewards';
import { RULES_QUERY_KEY } from '@/data/rules/queries';
import { fetchRules } from '@/data/rules/fetchRules';
import { fetchTasks, TASKS_QUERY_KEY } from '@/data/tasks/queries';
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';
// Remove notification preferences from preload - they use direct fetch like wellness reminders
import { useUserIds } from '@/contexts/UserIdsContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

// Define necessary keys directly or import from a central query key store if available
const PUNISHMENTS_QUERY_KEY = ['punishments'];

export const usePreloadAppCoreData = () => {
  const cacheToken = captureCacheToken();
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  const { user } = useAuth();

  useEffect(() => {
    const prefetchData = async () => {
      // Only prefetch if we have user IDs
      if (!subUserId && !domUserId) {
        logger.debug('[PreloadAppCoreData] No user IDs available, skipping prefetch');
        return;
      }

      logger.debug('[PreloadAppCoreData] Pre-fetching core application data...');

      // Notification preferences are not preloaded - they use direct fetch like wellness reminders

      // Rewards
      await queryClient.prefetchQuery({
        queryKey: legacyQueryKey(REWARDS_QUERY_KEY, cacheToken),
        queryFn: () => fetchRewards(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Rewards pre-fetched.');

      // Rules
      await queryClient.prefetchQuery({
        queryKey: legacyQueryKey(RULES_QUERY_KEY, cacheToken),
        queryFn: () => fetchRules(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Rules pre-fetched.');

      // Tasks
      await queryClient.prefetchQuery({
        queryKey: legacyQueryKey(TASKS_QUERY_KEY, cacheToken),
        queryFn: () => fetchTasks(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Tasks pre-fetched.');

      // Punishments
      await queryClient.prefetchQuery({
        queryKey: legacyQueryKey(PUNISHMENTS_QUERY_KEY, cacheToken),
        queryFn: () => fetchPunishments(subUserId, domUserId),
      });
      logger.debug('[PreloadAppCoreData] Punishments pre-fetched.');

      logger.debug('[PreloadAppCoreData] Core data pre-fetching complete.');
    };

    if (
      !queryClient.getQueryData(legacyQueryKey(REWARDS_QUERY_KEY, cacheToken)) ||
      !queryClient.getQueryData(legacyQueryKey(RULES_QUERY_KEY, cacheToken)) ||
      !queryClient.getQueryData(legacyQueryKey(TASKS_QUERY_KEY, cacheToken)) ||
      !queryClient.getQueryData(legacyQueryKey(PUNISHMENTS_QUERY_KEY, cacheToken))
    ) {
      prefetchData();
    } else {
      logger.debug('[PreloadAppCoreData] Core data already in cache, skipping prefetch.');
    }
  }, [queryClient, subUserId, domUserId, user?.id, cacheToken]);
};
