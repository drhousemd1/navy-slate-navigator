
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query"; 
import { Reward } from '../rewards/types';
import { fetchRewards, REWARDS_QUERY_KEY } from '../rewards/queries';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

export type RewardsQueryResult = UseQueryResult<Reward[], Error>;

export function useRewards(): RewardsQueryResult {
  return useQuery<Reward[], Error>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    ...STANDARD_QUERY_CONFIG,
    // Override staleTime to ensure immediate refetch when needed
    staleTime: 0,
    // Enable refetch on focus for this critical data
    refetchOnWindowFocus: true
  });
}
