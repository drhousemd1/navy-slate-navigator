
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
    refetchOnWindowFocus: false
  });

  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
    refetchOnWindowFocus: false
  });

  const saveRewardMut = useMutation(saveRewardMutation(queryClient));
  const deleteRewardMut = useMutation(deleteRewardMutation(queryClient));
  const buyRewardMut = useMutation(buyRewardMutation(queryClient));
  const useRewardMut = useMutation(useRewardMutation(queryClient));
  const updatePointsMut = useMutation(updateUserPointsMutation(queryClient));

  return {
    rewards,
    totalPoints,
    totalRewardsSupply,
    isLoading: rewardsLoading,
    error: rewardsError,
    saveReward: (rewardData: Partial<Reward>, currentIndex?: number | null) => 
      saveRewardMut.mutateAsync({ rewardData, currentIndex }),
    deleteReward: (rewardId: string) => 
      deleteRewardMut.mutateAsync(rewardId),
    buyReward: (rewardId: string, cost: number) => 
      buyRewardMut.mutateAsync({ rewardId, cost }),
    useReward: (rewardId: string) => 
      useRewardMut.mutateAsync(rewardId),
    updatePoints: (points: number) => 
      updatePointsMut.mutateAsync(points),
    refetchRewards: () => refetchRewards(),
    refetchPoints: () => refetchPoints(),
    refreshPointsFromDatabase: () => {
      refetchPoints();
      refetchSupply();
    }
  };
};
