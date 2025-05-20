import { useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useCallback } from 'react'; // Added useCallback import
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY, 
  REWARDS_DOM_POINTS_QUERY_KEY, 
  REWARDS_SUPPLY_QUERY_KEY, // Assuming this is for global supply, not individual
  fetchRewards, 
  fetchRewardSupply, // Assuming this is exported from queries
} from "./queries"; 
import { Reward, RewardWithPointsAndSupply } from "./types"; // RewardWithPointsAndSupply should now be available
import { useAuth } from "@/contexts/auth"; // Import useAuth to get user ID for points

// Aliasing imports to avoid conflict, or ensure local functions have different names
import { fetchUserPoints as fetchUserPointsQuery, fetchUserDomPoints as fetchUserDomPointsQuery } from "./queries";


export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get the current user
  const userId = user?.id; // Extract userId

  const { data: rewards = [], isLoading: isLoadingRewards, error: rewardsError, refetch: refetchRewards } = useQuery<Reward[], Error>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
  });

  // Local function to fetch user points (sub points)
  const fetchLocalUserPoints = async (currentUserId?: string): Promise<number> => {
    if (!currentUserId) return 0;
    // This should ideally use a query hook if it's for display, or be part of a mutation
    // For now, direct fetch as it was structured
    const { data, error } = await queryClient.fetchQuery({
        queryKey: ['profile_points', currentUserId, 'sub'], // More specific key
        queryFn: () => fetchUserPointsQuery(currentUserId), // Use aliased import
    });
    if (error) {
        console.error("Error fetching user points in useRewardsData:", error);
        return 0; // Default to 0 on error
    }
    return data ?? 0;
  };

  // Local function to fetch user DOM points
  const fetchLocalUserDomPoints = async (currentUserId?: string): Promise<number> => {
    if (!currentUserId) return 0;
    const { data, error } = await queryClient.fetchQuery({
        queryKey: ['profile_points', currentUserId, 'dom'], // More specific key
        queryFn: () => fetchUserDomPointsQuery(currentUserId), // Use aliased import
    });
     if (error) {
        console.error("Error fetching user DOM points in useRewardsData:", error);
        return 0; // Default to 0 on error
    }
    return data ?? 0;
  };

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

  const getRewardSupply = useCallback(async (rewardId: string) => {
    return fetchRewardSupply(rewardId);
  }, [fetchRewardSupply]); // Added fetchRewardSupply to dependency array

  const rewardsWithPointsAndSupply: UseQueryResult<RewardWithPointsAndSupply[], Error> = useQuery<RewardWithPointsAndSupply[], Error, RewardWithPointsAndSupply[], (string | undefined)[]>({ // Corrected queryKey type
    queryKey: [REWARDS_QUERY_KEY[0], userId, 'withPointsAndSupply'], // Use REWARDS_QUERY_KEY[0] for the base key string
    queryFn: async () => {
      const baseRewards = await fetchRewards();
      // const currentSubPoints = userId ? await fetchUserPointsQuery(userId) : 0; // Not needed per reward
      // const currentDomPoints = userId ? await fetchUserDomPointsQuery(userId) : 0; // Not needed per reward

      return Promise.all(
        baseRewards.map(async (reward) => {
          const supply = await fetchRewardSupply(reward.id);
          return {
            ...reward,
            // userSubPoints: currentSubPoints, 
            // userDomPoints: currentDomPoints,
            supply: supply, // supply here might be redundant if Reward type already has it with correct meaning
          };
        })
      );
    },
    enabled: !!userId || !user, 
  });


  return {
    rewards, // Raw rewards list
    rewardsWithSupply: rewardsWithPointsAndSupply.data || [], // Rewards enhanced with supply (and potentially points if needed)
    isLoadingRewards: isLoadingRewards || rewardsWithPointsAndSupply.isLoading,
    rewardsError: rewardsError || rewardsWithPointsAndSupply.error, // Combine errors
    userPoints, // Sub points for the current user
    userDomPoints, // DOM points for the current user
    isLoadingUserPoints,
    isLoadingUserDomPoints,
    refetchRewards, // Refetch base rewards
    refetchUserPoints, // Refetch user's sub points
    refetchUserDomPoints, // Refetch user's DOM points
    refetchRewardsWithSupply: rewardsWithPointsAndSupply.refetch, // Refetch combined data
    getRewardSupply,
    fetchUserPoints: fetchLocalUserPoints, // Expose local fetcher
    fetchUserDomPoints: fetchLocalUserDomPoints, // Expose local fetcher
  };
};
