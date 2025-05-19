
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { REWARDS_QUERY_KEY, fetchRewards } from '@/data/rewards/queries';
import { RULES_QUERY_KEY, fetchRules } from '@/data/rules/queries';
import { fetchTasks } from '@/data/tasks/queries';
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

export const usePreloadAppCoreData = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchData = async () => {
      console.log('[PreloadAppCoreData] Pre-fetching core application data...');
      
      // Rewards
      await queryClient.prefetchQuery({
        queryKey: REWARDS_QUERY_KEY,
        queryFn: fetchRewards,
      });
      console.log('[PreloadAppCoreData] Rewards pre-fetched.');

      // Rules
      await queryClient.prefetchQuery({
        queryKey: RULES_QUERY_KEY,
        queryFn: fetchRules,
      });
      console.log('[PreloadAppCoreData] Rules pre-fetched.');

      // Tasks
      await queryClient.prefetchQuery({
        queryKey: CRITICAL_QUERY_KEYS.TASKS,
        queryFn: fetchTasks,
      });
      console.log('[PreloadAppCoreData] Tasks pre-fetched.');

      // Punishments
      await queryClient.prefetchQuery({
        queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS,
        queryFn: fetchPunishments,
      });
      console.log('[PreloadAppCoreData] Punishments pre-fetched.');

      console.log('[PreloadAppCoreData] Core data pre-fetching complete.');
    };

    // Check if data already exists to avoid unnecessary prefetching on every component mount
    if (
      !queryClient.getQueryData(REWARDS_QUERY_KEY) ||
      !queryClient.getQueryData(RULES_QUERY_KEY) ||
      !queryClient.getQueryData(CRITICAL_QUERY_KEYS.TASKS) ||
      !queryClient.getQueryData(CRITICAL_QUERY_KEYS.PUNISHMENTS)
    ) {
      prefetchData();
    } else {
      console.log('[PreloadAppCoreData] Core data already in cache, skipping prefetch.');
    }
  }, [queryClient]);
};
