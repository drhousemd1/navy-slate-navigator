
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchRewards, 
  createReward, 
  updateReward, 
  deleteReward, 
  useReward,
  getUserPoints,
  uploadRewardImage
} from '@/services/rewards';
import { Reward, CreateRewardInput, UpdateRewardInput } from '@/types/reward.types';
import { toast } from '@/hooks/use-toast';

export const REWARDS_QUERY_KEY = 'rewards';
export const USER_POINTS_QUERY_KEY = 'user-points';

export const useRewardsData = () => {
  const queryClient = useQueryClient();

  // Query for fetching all rewards
  const { 
    data: rewards = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [REWARDS_QUERY_KEY],
    queryFn: fetchRewards,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for fetching user points
  const { 
    data: userPoints = 0,
    isLoading: isLoadingPoints,
    refetch: refetchPoints,
  } = useQuery({
    queryKey: [USER_POINTS_QUERY_KEY],
    queryFn: getUserPoints,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Mutation for creating a reward
  const createRewardMutation = useMutation({
    mutationFn: (newReward: CreateRewardInput) => createReward(newReward),
    onSuccess: (newReward) => {
      // Update cache optimistically
      queryClient.setQueryData(
        [REWARDS_QUERY_KEY],
        (oldData: Reward[] = []) => [newReward, ...oldData]
      );
      
      toast({
        title: "Reward created",
        description: "Your reward has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create reward",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a reward
  const updateRewardMutation = useMutation({
    mutationFn: (updatedReward: UpdateRewardInput) => updateReward(updatedReward),
    onMutate: async (updatedReward) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_QUERY_KEY] });
      
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_QUERY_KEY]);
      
      if (previousRewards) {
        queryClient.setQueryData(
          [REWARDS_QUERY_KEY],
          previousRewards.map(reward => 
            reward.id === updatedReward.id ? { ...reward, ...updatedReward } : reward
          )
        );
      }
      
      return { previousRewards };
    },
    onSuccess: () => {
      toast({
        title: "Reward updated",
        description: "Your reward has been updated successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData([REWARDS_QUERY_KEY], context.previousRewards);
      }
      
      toast({
        title: "Failed to update reward",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_QUERY_KEY] });
    },
  });

  // Mutation for deleting a reward
  const deleteRewardMutation = useMutation({
    mutationFn: (rewardId: string) => deleteReward(rewardId),
    onMutate: async (rewardId) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_QUERY_KEY] });
      
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_QUERY_KEY]);
      
      if (previousRewards) {
        queryClient.setQueryData(
          [REWARDS_QUERY_KEY],
          previousRewards.filter(reward => reward.id !== rewardId)
        );
      }
      
      return { previousRewards };
    },
    onSuccess: () => {
      toast({
        title: "Reward deleted",
        description: "Your reward has been deleted successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData([REWARDS_QUERY_KEY], context.previousRewards);
      }
      
      toast({
        title: "Failed to delete reward",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_QUERY_KEY] });
    },
  });

  // Mutation for using a reward
  const useRewardMutation = useMutation({
    mutationFn: ({ rewardId, cost }: { rewardId: string; cost: number }) => 
      useReward(rewardId, cost),
    onMutate: async ({ rewardId, cost }) => {
      await queryClient.cancelQueries({ queryKey: [USER_POINTS_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [REWARDS_QUERY_KEY] });
      
      const previousPoints = queryClient.getQueryData<number>([USER_POINTS_QUERY_KEY]);
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_QUERY_KEY]);
      
      // Optimistically update points
      if (previousPoints !== undefined) {
        queryClient.setQueryData(
          [USER_POINTS_QUERY_KEY],
          Math.max(0, previousPoints - cost)
        );
      }
      
      // Optimistically update reward supply if applicable
      if (previousRewards) {
        queryClient.setQueryData(
          [REWARDS_QUERY_KEY],
          previousRewards.map(reward => {
            if (reward.id === rewardId && reward.supply > 0) {
              return { ...reward, supply: reward.supply - 1 };
            }
            return reward;
          })
        );
      }
      
      return { previousPoints, previousRewards };
    },
    onSuccess: (_, { rewardId }) => {
      const rewardUsed = rewards.find(r => r.id === rewardId);
      
      toast({
        title: "Reward redeemed",
        description: rewardUsed 
          ? `"${rewardUsed.title}" has been redeemed.` 
          : "Your reward has been redeemed successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      // Rollback optimistic updates
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData([USER_POINTS_QUERY_KEY], context.previousPoints);
      }
      
      if (context?.previousRewards) {
        queryClient.setQueryData([REWARDS_QUERY_KEY], context.previousRewards);
      }
      
      toast({
        title: "Failed to redeem reward",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [REWARDS_QUERY_KEY] });
    },
  });

  // Mutation for uploading a reward image
  const uploadImageMutation = useMutation({
    mutationFn: ({ file, rewardId }: { file: File; rewardId: string }) => 
      uploadRewardImage(file, rewardId),
    onSuccess: (imageUrl, { rewardId }) => {
      // Update the reward with the new image URL
      updateRewardMutation.mutate({ 
        id: rewardId, 
        image_url: imageUrl 
      });
      
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    rewards,
    isLoading,
    error,
    userPoints,
    isLoadingPoints,
    refetchPoints,
    createReward: createRewardMutation.mutate,
    updateReward: updateRewardMutation.mutate,
    deleteReward: deleteRewardMutation.mutate,
    useReward: useRewardMutation.mutate,
    uploadRewardImage: uploadImageMutation.mutate,
  };
};
