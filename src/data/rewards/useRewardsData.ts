
import { useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY, // Keep this
  REWARDS_DOM_POINTS_QUERY_KEY, // Keep this
  REWARDS_SUPPLY_QUERY_KEY, // Keep this for reward specific supply
  fetchRewards, 
  // fetchUserPoints, // This conflicts, will use local version or alias
  // fetchUserDomPoints, // This conflicts, will use local version or alias
  fetchRewardSupply,
  // No need to import getProfilePointsQueryKey if not used directly here, points are handled by usePointsManager
} from "./queries"; 
import { Reward, RewardWithPointsAndSupply } from "./types";
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


  // This query is for the general points, often managed by usePointsManager elsewhere
  // If this hook is solely for rewards list and their individual supplies, these might be redundant
  // For now, wiring them up with the userId from useAuth
  const { data: userPoints = 0, isLoading: isLoadingUserPoints, refetch: refetchUserPoints } = useQuery<number, Error>({
    queryKey: REWARDS_POINTS_QUERY_KEY(userId), // Use userId
    queryFn: () => userId ? fetchUserPointsQuery(userId) : Promise.resolve(0),
    enabled: !!userId, // Only run if userId is available
  });

  const { data: userDomPoints = 0, isLoading: isLoadingUserDomPoints, refetch: refetchUserDomPoints } = useQuery<number, Error>({
    queryKey: REWARDS_DOM_POINTS_QUERY_KEY(userId), // Use userId
    queryFn: () => userId ? fetchUserDomPointsQuery(userId) : Promise.resolve(0),
    enabled: !!userId, // Only run if userId is available
  });

  const getRewardSupply = useCallback(async (rewardId: string) => {
    // This can remain a direct fetch or be converted to a useQuery instance if needed reactively elsewhere
    return fetchRewardSupply(rewardId);
  }, []);

  const rewardsWithPointsAndSupply: UseQueryResult<RewardWithPointsAndSupply[], Error> = useQuery<RewardWithPointsAndSupply[], Error, RewardWithPointsAndSupply[], unknown[]>({
    queryKey: [REWARDS_QUERY_KEY, userId, 'withPointsAndSupply'],
    queryFn: async () => {
      const baseRewards = await fetchRewards();
      // const currentSubPoints = userId ? await fetchUserPointsQuery(userId) : 0;
      // const currentDomPoints = userId ? await fetchUserDomPointsQuery(userId) : 0;

      return Promise.all(
        baseRewards.map(async (reward) => {
          const supply = await fetchRewardSupply(reward.id);
          return {
            ...reward,
            // userSubPoints: currentSubPoints, // Points are now typically managed by usePointsManager globally
            // userDomPoints: currentDomPoints, // So, these might not be needed per reward item here.
            supply: supply,
          };
        })
      );
    },
    enabled: !!userId || !user, // Fetch even if user is null initially (for public rewards), then refetch if user changes
  });


  return {
    rewards, // Raw rewards list
    rewardsWithSupply: rewardsWithPointsAndSupply.data || [], // Rewards enhanced with supply (and potentially points if needed)
    isLoadingRewards: isLoadingRewards || rewardsWithPointsAndSupply.isLoading,
    rewardsError, // Error from base rewards fetch
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
