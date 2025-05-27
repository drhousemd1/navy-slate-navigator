
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { REWARDS_QUERY_KEY, fetchRewards } from '@/data/rewards/queries';
import { RULES_QUERY_KEY } from '@/data/rules/queries'; 
import { fetchRules } from '@/data/rules/fetchRules'; 
import { fetchTasks } from '@/data/tasks/queries';
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';
import { logger } from '@/lib/logger'; // Added logger import

// Define necessary keys directly or import from a central query key store if available
const TASKS_QUERY_KEY = ['tasks'];
const PUNISHMENTS_QUERY_KEY = ['punishments'];


export const usePreloadAppCoreData = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchData = async () => {
      logger.debug('[PreloadAppCoreData] Pre-fetching core application data...');
      
      // Rewards
      await queryClient.prefetchQuery({
        queryKey: REWARDS_QUERY_KEY,
        queryFn: fetchRewards,
      });
      logger.debug('[PreloadAppCoreData] Rewards pre-fetched.');

      // Rules
      await queryClient.prefetchQuery({
        queryKey: RULES_QUERY_KEY,
        queryFn: fetchRules, 
      });
      logger.debug('[PreloadAppCoreData] Rules pre-fetched.');

      // Tasks
      await queryClient.prefetchQuery({
        queryKey: TASKS_QUERY_KEY, // Replaced CRITICAL_QUERY_KEYS.TASKS
        queryFn: fetchTasks,
      });
      logger.debug('[PreloadAppCoreData] Tasks pre-fetched.');

      // Punishments
      await queryClient.prefetchQuery({
        queryKey: PUNISHMENTS_QUERY_KEY, // Replaced CRITICAL_QUERY_KEYS.PUNISHMENTS
        queryFn: fetchPunishments,
      });
      logger.debug('[PreloadAppCoreData] Punishments pre-fetched.');

      logger.debug('[PreloadAppCoreData] Core data pre-fetching complete.');
    };

    if (
      !queryClient.getQueryData(REWARDS_QUERY_KEY) ||
      !queryClient.getQueryData(RULES_QUERY_KEY) ||
      !queryClient.getQueryData(TASKS_QUERY_KEY) || // Replaced CRITICAL_QUERY_KEYS.TASKS
      !queryClient.getQueryData(PUNISHMENTS_QUERY_KEY) // Replaced CRITICAL_QUERY_KEYS.PUNISHMENTS
    ) {
      prefetchData();
    } else {
      logger.debug('[PreloadAppCoreData] Core data already in cache, skipping prefetch.');
    }
  }, [queryClient]);
};
