
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';

const REWARDS_KEY = 'rewards';

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
  const userIdPromise = supabase.auth.getUser().then(res => res.data.user?.id || '');

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

  const {
    data: expectedCardCount = rewards.length || 1,
  } = useQuery({
    queryKey: [REWARDS_KEY, 'count'],
    queryFn: getRewardsCount,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: points = 0,
    refetch: refetchPoints
  } = useQuery({
    queryKey: ['profile', 'points'],
    queryFn: async () => {
      const id = await userIdPromise;
      if (!id) return 0;
      return fetchProfilePoints(id);
    },
    staleTime: 5 * 60 * 1000,
  });

  const createRewardMutation = useMutation({
    mutationFn: createReward,
    onSuccess: (newReward) => {
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

  const updateRewardMutation = useMutation({
    mutationFn: updateReward,
    onMutate: async (updatedReward) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];
      
      queryClient.setQueryData(
        [REWARDS_KEY],
        (oldData: Reward[] = []) => oldData.map(reward => 
          reward.id === updatedReward.id ? { ...reward, ...updatedReward } : reward
        )
      );
      
      return { previousRewards };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reward updated successfully",
      });
    },
    onError: (error, _, context) => {
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
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
    }
  });

  const deleteRewardMutation = useMutation({
    mutationFn: deleteReward,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];
      
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
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
    }
  });

  const buyRewardMutation = useMutation({
    mutationFn: async ({ 
      rewardId, 
      cost
    }: { 
      rewardId: string, 
      cost: number 
    }) => {
      const id = await userIdPromise;
      if (!id) throw new Error("User not authenticated");
      
      const newPoints = points - cost;
      if (newPoints < 0) throw new Error("Not enough points");
      
      await updateProfilePoints(id, newPoints);
      
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      
      await updateRewardSupply(rewardId, reward.supply + 1);
    },
    onMutate: async ({ rewardId, cost }) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      await queryClient.cancelQueries({ queryKey: ['profile', 'points'] });
      
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];
      const previousPoints = queryClient.getQueryData<number>(['profile', 'points']) || 0;
      
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
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'points'] });
    }
  });

  const useRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      if (reward.supply <= 0) throw new Error("No rewards to use");

      const newSupply = reward.supply - 1;
      await updateRewardSupply(rewardId, newSupply);

      const today = new Date();
      const dayOfWeekMondayBased = getMondayBasedDay(today);

      // Calculate ISO Week Number according to ISO-8601 standard:
      // Week starts on Monday; week 1 is the first week with a Thursday in it
      const isoWeekNumString = (() => {
        // Copy the date so as not to modify original
        const dateCopy = new Date(today.getTime());
        // Set to nearest Thursday: current date + 4 - current day number with Sunday=0
        const day = dateCopy.getDay() || 7; // Sunday=7 for ISO
        dateCopy.setDate(dateCopy.getDate() + 4 - day);
        // Get first day of the year
        const yearStart = new Date(dateCopy.getFullYear(), 0, 1);
        // Calculate full weeks to nearest Thursday
        const weekNo = Math.ceil(((dateCopy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${dateCopy.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      })();

      const { error } = await supabase.from('reward_usage').insert({
        reward_id: rewardId,
        day_of_week: dayOfWeekMondayBased,
        week_number: isoWeekNumString,
        used: true,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onMutate: async (rewardId) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_KEY] });
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_KEY]) || [];

      queryClient.setQueryData(
        [REWARDS_KEY],
        (oldData: Reward[] = []) =>
          oldData.map(reward =>
            reward.id === rewardId
              ? { ...reward, supply: reward.supply > 0 ? reward.supply - 1 : 0 }
              : reward
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
      queryClient.invalidateQueries({ queryKey: [REWARDS_KEY] });
    }
  });

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
