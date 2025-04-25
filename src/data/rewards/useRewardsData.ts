
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { Reward } from '@/lib/rewardUtils';
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_SUPPLY_QUERY_KEY,
  fetchRewards,
  fetchUserPoints,
  fetchTotalRewardsSupply
} from './queries';
import {
  saveRewardMutation,
  deleteRewardMutation,
  buyRewardMutation,
  useRewardMutation,
  updateUserPointsMutation
} from './mutations';

export const useRewardsData = () => {
  const queryClient = useQueryClient();

  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    error: rewardsError,
    refetch: refetchRewards
  } = useQuery({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    refetchOnWindowFocus: false
  });

  const {
    data: totalPoints = 0,
    refetch: refetchPoints
  } = useQuery({
    queryKey: REWARDS_POINTS_QUERY_KEY,
    queryFn: fetchUserPoints,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false
  });

  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false
  });

  // Configure mutations with toast disabled in the handlers
  // Toast messages will be handled at the UI level instead
  const saveRewardMut = useMutation(saveRewardMutation(queryClient, false));
  const deleteRewardMut = useMutation(deleteRewardMutation(queryClient, false));
  const buyRewardMut = useMutation(buyRewardMutation(queryClient));
  const useRewardMut = useMutation(useRewardMutation(queryClient));
  const updatePointsMut = useMutation(updateUserPointsMutation(queryClient));

  const refetchRewardsTyped = (options?: RefetchOptions) => {
    return refetchRewards(options) as Promise<QueryObserverResult<Reward[], Error>>;
  };

  const refreshPointsFromDatabase = async () => {
    await Promise.all([
      refetchPoints(),
      refetchSupply()
    ]);
  };

  return {
    // Data
    rewards,
    totalPoints,
    totalRewardsSupply,
    
    // Loading state
    isLoading: rewardsLoading,
    error: rewardsError,
    
    // Mutations
    saveReward: saveRewardMut.mutateAsync,
    deleteReward: deleteRewardMut.mutateAsync,
    buyReward: buyRewardMut.mutateAsync,
    useReward: useRewardMut.mutateAsync,
    updatePoints: updatePointsMut.mutateAsync,
    
    // Refetch functions
    refetchRewards: refetchRewardsTyped,
    refetchPoints,
    refreshPointsFromDatabase
  };
};
