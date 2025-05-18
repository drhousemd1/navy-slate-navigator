
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { REWARDS_QUERY_KEY, fetchRewards } from '@/data/rewards/queries'; // Assuming fetchRewards is the queryFn
import { fetchRules, RULES_QUERY_KEY } from '@/data/rules/queries'; // Assuming fetchRules and RULES_QUERY_KEY
import { fetchProfile, PROFILE_QUERY_KEY } from '@/data/profile/queries'; // Assuming fetchProfile and PROFILE_QUERY_KEY

// Note: The existence and exact export names for fetchRules, RULES_QUERY_KEY, fetchProfile, PROFILE_QUERY_KEY
// are assumed. If they differ or don't exist, they'd need to be created or adjusted.
// For now, using common patterns.
// Fallback definitions if specific files don't exist or keys aren't exported.
const actualRulesQueryKey = RULES_QUERY_KEY || ['rules'];
const actualProfileQueryKey = PROFILE_QUERY_KEY || ['profile'];

// Dummy fetch functions if the actual ones are not available for import path checking
const placeholderFetchRules = async () => { console.warn("Placeholder fetchRules called"); return []; };
const placeholderFetchProfile = async () => { console.warn("Placeholder fetchProfile called"); return null; };

const actualFetchRules = typeof fetchRules === 'function' ? fetchRules : placeholderFetchRules;
const actualFetchProfile = typeof fetchProfile === 'function' ? fetchProfile : placeholderFetchProfile;


export const usePreloadAppCoreData = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchData = async () => {
      console.log('[PreloadAppCoreData] Pre-fetching core application data...');
      await queryClient.prefetchQuery({
        queryKey: REWARDS_QUERY_KEY,
        queryFn: fetchRewards,
      });
      console.log('[PreloadAppCoreData] Rewards pre-fetched.');

      await queryClient.prefetchQuery({
        queryKey: actualRulesQueryKey,
        queryFn: actualFetchRules as () => Promise<any[]>, // Cast to expected type
      });
      console.log('[PreloadAppCoreData] Rules pre-fetched.');

      await queryClient.prefetchQuery({
        queryKey: actualProfileQueryKey,
        queryFn: actualFetchProfile as () => Promise<any | null>, // Cast to expected type
      });
      console.log('[PreloadAppCoreData] Profile pre-fetched.');
      console.log('[PreloadAppCoreData] Core data pre-fetching complete.');
    };

    // Check if data already exists to avoid unnecessary prefetching on every component mount
    // This is a simple check; more sophisticated logic might be needed for staleTime considerations
    if (
      !queryClient.getQueryData(REWARDS_QUERY_KEY) ||
      !queryClient.getQueryData(actualRulesQueryKey) ||
      !queryClient.getQueryData(actualProfileQueryKey)
    ) {
      prefetchData();
    } else {
      console.log('[PreloadAppCoreData] Core data already in cache, skipping prefetch.');
    }
  }, [queryClient]);
};
