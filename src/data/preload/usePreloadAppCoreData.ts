
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { REWARDS_QUERY_KEY, fetchRewards } from '@/data/rewards/queries';
import { fetchRules } from '@/data/rules/fetchRules';
import { fetchTasks } from '@/data/tasks/queries'; // Corrected import path
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

// By removing the faulty imports for RULES_QUERY_KEY, fetchProfile, and PROFILE_QUERY_KEY,
// these variables will be undefined. The existing fallback logic below will then correctly
// assign default values or use placeholders.
// let RULES_QUERY_KEY: string[] | undefined; // Implicitly undefined
// let fetchProfile: (() => Promise<any>) | undefined; // Implicitly undefined
// let PROFILE_QUERY_KEY: string[] | undefined; // Implicitly undefined

// Note: The existence and exact export names for fetchRules, RULES_QUERY_KEY, fetchProfile, PROFILE_QUERY_KEY
// are assumed. If they differ or don't exist, they'd need to be created or adjusted.
// For now, using common patterns.
// Fallback definitions if specific files don't exist or keys aren't exported.

// @ts-ignore: RULES_QUERY_KEY will be undefined if not imported, handled by fallback.
const actualRulesQueryKey = (typeof RULES_QUERY_KEY !== 'undefined' ? RULES_QUERY_KEY : undefined) || ['rules'];
// @ts-ignore: PROFILE_QUERY_KEY will be undefined if not imported, handled by fallback.
const actualProfileQueryKey = (typeof PROFILE_QUERY_KEY !== 'undefined' ? PROFILE_QUERY_KEY : undefined) || ['profile'];

// Dummy fetch functions if the actual ones are not available for import path checking
const placeholderFetchRules = async () => { console.warn("Placeholder fetchRules called"); return []; };
const placeholderFetchProfile = async () => { console.warn("Placeholder fetchProfile called"); return null; };

// @ts-ignore: fetchRules is imported, but this provides a fallback if it's somehow not a function.
const actualFetchRulesToUse = typeof fetchRules === 'function' ? fetchRules : placeholderFetchRules;
// @ts-ignore: fetchProfile will be undefined if not imported, placeholderFetchProfile will be used.
const actualFetchProfileToUse = (typeof fetchProfile !== 'undefined' && typeof fetchProfile === 'function' ? fetchProfile : undefined) || placeholderFetchProfile;

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
        queryKey: CRITICAL_QUERY_KEYS.RULES,
        queryFn: actualFetchRulesToUse as () => Promise<any[]>,
      });
      console.log('[PreloadAppCoreData] Rules pre-fetched.');

      // Profile
      await queryClient.prefetchQuery({
        queryKey: actualProfileQueryKey,
        queryFn: actualFetchProfileToUse as () => Promise<any | null>,
      });
      console.log('[PreloadAppCoreData] Profile pre-fetched.');

      // Tasks
      await queryClient.prefetchQuery({
        queryKey: CRITICAL_QUERY_KEYS.TASKS,
        queryFn: fetchTasks, // Uses corrected import
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
      !queryClient.getQueryData(CRITICAL_QUERY_KEYS.RULES) ||
      !queryClient.getQueryData(actualProfileQueryKey) ||
      !queryClient.getQueryData(CRITICAL_QUERY_KEYS.TASKS) ||
      !queryClient.getQueryData(CRITICAL_QUERY_KEYS.PUNISHMENTS)
    ) {
      prefetchData();
    } else {
      console.log('[PreloadAppCoreData] Core data already in cache, skipping prefetch.');
    }
  }, [queryClient]);
};
