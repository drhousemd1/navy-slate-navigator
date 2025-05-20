
import { useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useCallback } from 'react';
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY, // Assuming this is an array like ['profile_points']
  REWARDS_DOM_POINTS_QUERY_KEY, // Assuming this is an array like ['profile_dom_points']
  fetchRewards, 
} from "./queries"; 
import { Reward, RewardWithPointsAndSupply } from "./types";
import { useAuth } from "@/contexts/auth"; 

import { fetchUserPoints as fetchUserPointsQuery, fetchUserDomPoints as fetchUserDomPointsQuery } from "./queries"; // Assuming these take 0 args and use auth context

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); 
  const userId = user?.id; 

  const { data: rewards = [], isLoading: isLoadingRewards, error: rewardsError, refetch: refetchRewards } = useQuery<Reward[], Error>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
  });

  const fetchLocalUserPoints = useCallback(async (): Promise<number> => {
    if (!userId) return 0; // Check if user is available
    const pointsData = await queryClient.fetchQuery<number, Error, number, readonly string[]>({ // QueryKey is readonly string[]
        queryKey: REWARDS_POINTS_QUERY_KEY, // Use as direct array
        queryFn: fetchUserPointsQuery, // Assumes it takes 0 args
    });
    return pointsData ?? 0;
  }, [queryClient, userId, fetchUserPointsQuery]);

  const fetchLocalUserDomPoints = useCallback(async (): Promise<number> => {
    if (!userId) return 0; // Check if user is available
    const pointsData = await queryClient.fetchQuery<number, Error, number, readonly string[]>({ // QueryKey is readonly string[]
        queryKey: REWARDS_DOM_POINTS_QUERY_KEY, // Use as direct array
        queryFn: fetchUserDomPointsQuery, // Assumes it takes 0 args
    });
    return pointsData ?? 0;
  }, [queryClient, userId, fetchUserDomPointsQuery]);

  const { data: userPoints = 0, isLoading: isLoadingUserPoints, refetch: refetchUserPoints } = useQuery<number, Error>({
    queryKey: REWARDS_POINTS_QUERY_KEY, // Use as direct array
    queryFn: fetchUserPointsQuery, // Assumes it takes 0 args
    enabled: !!userId, 
  });

  const { data: userDomPoints = 0, isLoading: isLoadingUserDomPoints, refetch: refetchUserDomPoints } = useQuery<number, Error>({
    queryKey: REWARDS_DOM_POINTS_QUERY_KEY, // Use as direct array
    queryFn: fetchUserDomPointsQuery, // Assumes it takes 0 args
    enabled: !!userId, 
  });

  const getRewardSupply = useCallback(async (rewardId: string): Promise<number> => {
    const reward = rewards.find(r => r.id === rewardId);
    return reward ? reward.supply : 0;
  }, [rewards]);

  // This query combines rewards with user's points.
  const rewardsWithPointsAndSupplyQuery: UseQueryResult<RewardWithPointsAndSupply[], Error> = useQuery<RewardWithPointsAndSupply[], Error, RewardWithPointsAndSupply[], ReadonlyArray<string | undefined | Reward[]>>({
    queryKey: [REWARDS_QUERY_KEY[0], userId, 'withPointsAndSupply', rewards], // rewards used in key for dependency
    queryFn: async () => {
      // Using the 'rewards' data from the first query directly as it's a dependency in queryKey
      return rewards.map(reward => ({
        ...reward,
      }));
    },
    enabled: (!!userId || !user) && rewards.length > 0, 
  });


  return {
    rewards, 
    rewardsWithSupply: rewardsWithPointsAndSupplyQuery.data || [], 
    isLoadingRewards: isLoadingRewards || rewardsWithPointsAndSupplyQuery.isLoading,
    rewardsError: rewardsError || rewardsWithPointsAndSupplyQuery.error, 
    userPoints, 
    userDomPoints, 
    isLoadingUserPoints,
    isLoadingUserDomPoints,
    refetchRewards, 
    refetchUserPoints, 
    refetchUserDomPoints, 
    refetchRewardsWithSupply: rewardsWithPointsAndSupplyQuery.refetch, 
    getRewardSupply,
    fetchUserPoints: fetchLocalUserPoints, 
    fetchUserDomPoints: fetchLocalUserDomPoints, 
  };
};

