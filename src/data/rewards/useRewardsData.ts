
import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { Reward } from '@/lib/rewardUtils';
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  REWARDS_SUPPLY_QUERY_KEY,
  fetchRewards,
  fetchUserPoints,
  fetchUserDomPoints,
  fetchTotalRewardsSupply
} from './queries';
import {
  saveRewardMutation,
  deleteRewardMutation,
  buyRewardMutation,
  useRewardMutation,
  updateUserPointsMutation
} from './mutations';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { usePointsManagement } from '@/contexts/rewards/usePointsManagement';

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { totalPoints, domPoints, updatePointsInDatabase, updateDomPointsInDatabase, refreshPointsFromDatabase } = usePointsManagement();

  // Query for fetching all rewards
  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    error: rewardsError,
    refetch: refetchRewards
  } = useQuery({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    ...STANDARD_QUERY_CONFIG
  });

  // Query for fetching total rewards supply
  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
    ...STANDARD_QUERY_CONFIG
  });

  // Ensure React Query cache always has the latest points and dom points values
  useEffect(() => {
    if (totalPoints > 0) {
      queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, totalPoints);
    }
  }, [totalPoints, queryClient]);

  useEffect(() => {
    if (domPoints > 0) {
      queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, domPoints);
    }
  }, [domPoints, queryClient]);

  // Configure mutations with toast disabled in the handlers
  const saveRewardMut = useMutation({
    mutationFn: saveRewardMutation(queryClient, false),
    // Removed query invalidation since we're using direct cache updates in the mutation
  });

  const deleteRewardMut = useMutation({
    mutationFn: deleteRewardMutation(queryClient, false),
    // Removed query invalidation since we're using direct cache updates in the mutation
  });

  const buyRewardMut = useMutation({
    mutationFn: buyRewardMutation(queryClient)
    // Direct cache updates in the mutation
  });

  const useRewardMut = useMutation({
    mutationFn: useRewardMutation(queryClient)
    // Direct cache updates in the mutation
  });

  const updatePointsMut = useMutation({
    mutationFn: updateUserPointsMutation(queryClient)
    // Direct cache updates in the mutation
  });

  const refetchRewardsTyped = (options?: RefetchOptions) => {
    return refetchRewards(options) as Promise<QueryObserverResult<Reward[], Error>>;
  };

  return {
    // Data
    rewards,
    totalPoints,
    totalRewardsSupply,
    domPoints,
    
    // Loading state
    isLoading: rewardsLoading,
    error: rewardsError,
    
    // Mutations
    saveReward: saveRewardMut.mutateAsync,
    deleteReward: deleteRewardMut.mutateAsync,
    buyReward: buyRewardMut.mutateAsync,
    useReward: useRewardMut.mutateAsync,
    updatePoints: updatePointsMut.mutateAsync,
    updateDomPoints: updateDomPointsInDatabase, // Add this new function
    
    // Refetch functions - maintained for compatibility
    refetchRewards: refetchRewardsTyped,
    refetchPoints: refreshPointsFromDatabase,
    refreshPointsFromDatabase
  };
};
