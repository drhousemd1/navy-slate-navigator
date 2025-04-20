import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';

// Keys for React Query cache
const REWARDS_KEY = 'rewards';

// Get rewards count for loading expectations
export const getRewardsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('rewards')
      .select('*', { count: 'exact', head: true })
      .abortSignal(AbortSignal.timeout(3000));
    
    if (error) throw error;
    return count || 0;
  } catch (e) {
    console.error("Error fetching rewards count:", e);
    return 0;
  }
};

// Fetch all rewards
export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching rewards:', error);
    throw error;
  }
};

// Create a new reward
export const createReward = async (rewardData: Partial<Reward> & { title: string }): Promise<Reward> => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .insert(rewardData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating reward:', error);
    throw error;
  }
};

// Update an existing reward
export const updateReward = async ({ id, ...data }: Partial<Reward> & { id: string }): Promise<void> => {
  try {
    const { error } = await supabase
      .from('rewards')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating reward:', error);
    throw error;
  }
};

// Delete a reward
export const deleteReward = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting reward:', error);
    throw error;
  }
};

// Update reward supply
export const updateRewardSupply = async (id: string, supply: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('rewards')
      .update({ supply })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating reward supply:', error);
    throw error;
  }
};

// Fetch profile points
export const fetchProfilePoints = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data?.points || 0;
  } catch (error) {
    console.error('Error fetching profile points:', error);
    return 0;
  }
};

// Update profile points
export const updateProfilePoints = async (userId: string, points: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ points })
      .eq('id', userId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating profile points:', error);
    throw error;
  }
};

export const useRewardsQuery = () => {
  const queryClient = useQueryClient();
  const userId = supabase.auth.getUser().then(res => res.data.user?.id || '');
  
  // Query for fetching all rewards
  const {
    data: rewards = [],
    isLoading,
    error
  } = useQuery({
    queryKey: [REWARDS_KEY],
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Query for fetching count of rewards (for loading skeletons)
  const {
    data: expectedCardCount = rewards.length || 1,
  } = useQuery({
    queryKey: [REWARDS_KEY, 'count'],
    queryFn: getRewardsCount,
    staleTime: 5 * 60 * 1000,
  });

  // Query for fetching user points
  const {
    data: points = 0,
    refetch: refetchPoints
  } = useQuery({
    queryKey: ['profile', 'points'],
    queryFn: async () => {
      const id = await userId;
      if (!id) return 0;
      return fetchProfilePoints(id);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Mutation for creating a reward
  const createRewardMutation = useMutation({
    mutationFn: createReward,
    onSuccess: (newReward) => {
      // Update the cache with new reward
      queryClient.setQueryData(
        [REWARDS_KEY],
        (oldData: Reward[] = []) => [...oldData, newReward]
      );
      
      toast({
        title: "Success",
        description: "Reward created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create reward. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for updating a reward
  const updateRewardMutation = useMutation({
    mutationFn: updateReward,
    onMutate: async (updatedReward) => {
      // Cancel outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      
      // Snapshot the previous value
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];
      
      // Optimistically update the cache with the new value
      queryClient.setQueryData(
        [REWARDS_KEY],
        (oldData: Reward[] = []) => oldData.map(reward => 
          reward.id === updatedReward.id ? { ...reward, ...updatedReward } : reward
        )
      );
      
      // Return the previous value for rollback
      return { previousRewards };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reward updated successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous value
      if (context?.previousRewards) {
        queryClient.setQueryData([REWARDS_KEY], context.previousRewards);
      }
      
      toast({
        title: "Error",
        description: "Failed to update reward. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to make sure our local data is in sync with the server
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
    }
  });

  // Mutation for deleting a reward
  const deleteRewardMutation = useMutation({
    mutationFn: deleteReward,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      
      // Snapshot the previous values
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];
      
      // Optimistically update caches
      queryClient.setQueryData(
        [REWARDS_KEY],
        (oldData: Reward[] = []) => oldData.filter(reward => reward.id !== id)
      );
      
      return { previousRewards };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous values
      if (context?.previousRewards) {
        queryClient.setQueryData([REWARDS_KEY], context.previousRewards);
      }
      
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
    }
  });

  // Mutation for buying a reward
  const buyRewardMutation = useMutation({
    mutationFn: async ({ 
      rewardId, 
      cost
    }: { 
      rewardId: string, 
      cost: number 
    }) => {
      const id = await userId;
      if (!id) throw new Error("User not authenticated");
      
      // First update points
      const newPoints = points - cost;
      if (newPoints < 0) throw new Error("Not enough points");
      
      await updateProfilePoints(id, newPoints);
      
      // Then update reward supply
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      
      await updateRewardSupply(rewardId, reward.supply + 1);
    },
    onMutate: async ({ rewardId, cost }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      await queryClient.cancelQueries({ queryKey: ['profile', 'points'] });
      
      // Snapshot the previous values
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];
      const previousPoints = queryClient.getQueryData<number>(['profile', 'points']) || 0;
      
      // Optimistically update caches
      queryClient.setQueryData(['profile', 'points'], previousPoints - cost);
      
      queryClient.setQueryData(
        [REWARDS_KEY],
        (oldData: Reward[] = []) => oldData.map(reward => 
          reward.id === rewardId ? { ...reward, supply: reward.supply + 1 } : reward
        )
      );
      
      return { previousRewards, previousPoints };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reward purchased successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous values
      if (context?.previousRewards) {
        queryClient.setQueryData([REWARDS_KEY], context.previousRewards);
      }
      if (context?.previousPoints) {
        queryClient.setQueryData(['profile', 'points'], context.previousPoints);
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to purchase reward",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'points'] });
    }
  });

  // Mutation for using a reward
  const useRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      if (reward.supply <= 0) throw new Error("No rewards to use");
      
      await updateRewardSupply(rewardId, reward.supply - 1);
      
      // Record reward usage
      const { error } = await supabase.from('reward_usage').insert({
        reward_id: rewardId,
        day_of_week: new Date().getDay(),
        week_number: `${new Date().getFullYear()}-${Math.floor(new Date().getDate() / 7)}`,
        used: true
      });
      
      if (error) throw error;
    },
    onMutate: async (rewardId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      
      // Snapshot the previous values
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];
      
      // Optimistically update caches
      queryClient.setQueryData(
        [REWARDS_KEY],
        (oldData: Reward[] = []) => oldData.map(reward => 
          reward.id === rewardId ? { ...reward, supply: reward.supply - 1 } : reward
        )
      );
      
      return { previousRewards };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reward used successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous values
      if (context?.previousRewards) {
        queryClient.setQueryData([REWARDS_KEY], context.previousRewards);
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to use reward",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
    }
  });

  // Calculate total rewards supply
  const totalRewardsSupply = rewards.reduce((total, reward) => total + reward.supply, 0);

  return {
    rewards,
    isLoading,
    error: error ? (error as Error) : null,
    expectedCardCount,
    points,
    totalRewardsSupply,
    refetchRewards: () => queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] }),
    refetchPoints,
    createReward: (data: Partial<Reward> & { title: string }) => createRewardMutation.mutateAsync(data),
    updateReward: (id: string, data: Partial<Reward>) => updateRewardMutation.mutateAsync({ ...data, id }),
    deleteReward: (id: string) => deleteRewardMutation.mutateAsync(id),
    buyReward: (rewardId: string, cost: number) => buyRewardMutation.mutateAsync({ rewardId, cost }),
    useReward: (rewardId: string) => useRewardMutation.mutateAsync(rewardId)
  };
};
