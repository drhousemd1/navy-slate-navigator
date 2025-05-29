
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { UseQueryResult } from "@tanstack/react-query"; 
import { Reward } from '../rewards/types';
import { useRewardsQuery } from '../rewards/queries';

export type RewardsQueryResult = UseQueryResult<Reward[], Error>;

export function useRewards(): RewardsQueryResult {
  return useRewardsQuery();
}
