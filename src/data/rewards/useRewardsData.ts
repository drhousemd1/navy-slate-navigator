
import { useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useCallback } from 'react'; // Added useCallback import
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY, 
  REWARDS_DOM_POINTS_QUERY_KEY,
  fetchRewards, 
  // fetchRewardSupply, // This function is not exported from queries.ts; supply is on Reward object
  fetchUserPoints as fetchUserPointsQuery, // Aliased to avoid naming conflicts
  fetchUserDomPoints as fetchUserDomPointsQuery // Aliased
} from "./queries"; 
import { Reward, RewardWithPointsAndSupply } from "./types"; // Corrected RewardWithPointsAndSupply import
import { useAuth } from "@/contexts/auth"; 

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); 
  const userId = user?.id; 

  const { data: rewards = [], isLoading: isLoadingRewards, error: rewardsError, refetch: refetchRewards } = useQuery<Reward[], Error>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
  });

  const fetchLocalUserPoints = useCallback(async (currentUserIdParam?: string): Promise<number> => {
    const idToFetch = currentUserIdParam || userId;
    if (!idToFetch) return 0;
    // fetchQuery returns the data directly.
    const pointsData = await queryClient.fetchQuery<number, Error, number, readonly (string | undefined)[]>({ 
        queryKey: REWARDS_POINTS_QUERY_KEY(idToFetch), 
        queryFn: () => fetchUserPointsQuery(idToFetch),
    });
    return pointsData || 0;
  }, [queryClient, userId, fetchUserPointsQuery]);

  const fetchLocalUserDomPoints = useCallback(async (currentUserIdParam?: string): Promise<number> => {
    const idToFetch = currentUserIdParam || userId;
    if (!idToFetch) return 0;
    const pointsData = await queryClient.fetchQuery<number, Error, number, readonly (string | undefined)[]>({
        queryKey: REWARDS_DOM_POINTS_QUERY_KEY(idToFetch), 
        queryFn: () => fetchUserDomPointsQuery(idToFetch),
    });
    return pointsData || 0;
  }, [queryClient, userId, fetchUserDomPointsQuery]);

  const { data: userPoints = 0, isLoading: isLoadingUserPoints, refetch: refetchUserPoints } = useQuery<number, Error>({
    queryKey: REWARDS_POINTS_QUERY_KEY(userId), 
    queryFn: () => userId ? fetchUserPointsQuery(userId) : Promise.resolve(0),
    enabled: !!userId, 
  });

  const { data: userDomPoints = 0, isLoading: isLoadingUserDomPoints, refetch: refetchUserDomPoints } = useQuery<number, Error>({
    queryKey: REWARDS_DOM_POINTS_QUERY_KEY(userId), 
    queryFn: () => userId ? fetchUserDomPointsQuery(userId) : Promise.resolve(0),
    enabled: !!userId, 
  });

  const getRewardSupply = useCallback(async (rewardId: string): Promise<number> => {
    const reward = rewards.find(r => r.id === rewardId);
    return reward ? reward.supply : 0;
  }, [rewards]);

  // This query combines rewards with user's points.
  // The 'supply' is already on each reward object from `fetchRewards`.
  // `RewardWithPointsAndSupply` type now essentially mirrors `Reward`.
  const rewardsWithPointsAndSupplyQuery: UseQueryResult<RewardWithPointsAndSupply[], Error> = useQuery<RewardWithPointsAndSupply[], Error, RewardWithPointsAndSupply[], ReadonlyArray<string | undefined | Reward[]>>({
    queryKey: [REWARDS_QUERY_KEY[0], userId, 'withPointsAndSupply', rewards], 
    queryFn: async () => {
      // `rewards` is already available from the first query.
      // If you need to re-fetch, use `fetchRewards()`
      return rewards.map(reward => ({
        ...reward,
        // No specific points transformation per reward item here unless defined in RewardWithPointsAndSupply
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

