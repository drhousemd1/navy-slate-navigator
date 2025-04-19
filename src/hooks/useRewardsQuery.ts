import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryConfig } from './useQueryConfig';
import { Reward } from '@/lib/rewardUtils';
import React from 'react';

const REWARDS_CACHE_KEY = 'rewards';

export const fetchRewards = async (): Promise<Reward[]> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useRewardsQuery = () => {
  const queryClient = useQueryClient();
  const queryConfig = useQueryConfig<Reward[]>([REWARDS_CACHE_KEY]);

  const {
    data: rewards = [],
    isLoading,
    error
  } = useQuery({
    ...queryConfig,
    queryKey: [REWARDS_CACHE_KEY],
    queryFn: fetchRewards,
    initialData: () => {
      try {
        const cached = localStorage.getItem(REWARDS_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            return data;
          }
        }
      } catch (e) {
        console.error('Error loading cached rewards:', e);
      }
      return [];
    },
  });

  React.useEffect(() => {
    if (rewards.length > 0) {
      try {
        localStorage.setItem(
          REWARDS_CACHE_KEY,
          JSON.stringify({
            data: rewards,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.error('Error caching rewards:', e);
      }
    }
  }, [rewards]);

  // Create a new reward
  const createRewardMutation = useMutation({
    mutationFn: async (rewardData: Partial<Reward>): Promise<Reward> => {
      const { data, error } = await supabase
        .from('rewards')
        .insert(rewardData)
        .select()
        .single();
        
      if (error) throw error;
      return data as Reward;
    },
    onSuccess: (newReward) => {
      queryClient.setQueryData(
        [REWARDS_CACHE_KEY],
        (oldData: Reward[] = []) => [newReward, ...oldData]
      );
      
      toast({
        title: "Success",
        description: "Reward created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating reward:', error);
      toast({
        title: "Error",
        description: "Failed to create reward. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update an existing reward
  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string, [key: string]: any }): Promise<Reward> => {
      const { data: updatedData, error } = await supabase
        .from('rewards')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return updatedData as Reward;
    },
    onMutate: async (updatedReward) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_CACHE_KEY] });
      
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_CACHE_KEY]);
      
      queryClient.setQueryData(
        [REWARDS_CACHE_KEY],
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
        queryClient.setQueryData([REWARDS_CACHE_KEY], context.previousRewards);
      }
      
      console.error('Error updating reward:', error);
      toast({
        title: "Error",
        description: "Failed to update reward. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_CACHE_KEY] });
    }
  });

  // Delete a reward
  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [REWARDS_CACHE_KEY] });
      
      const previousRewards = queryClient.getQueryData<Reward[]>([REWARDS_CACHE_KEY]);
      
      queryClient.setQueryData(
        [REWARDS_CACHE_KEY],
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
        queryClient.setQueryData([REWARDS_CACHE_KEY], context.previousRewards);
      }
      
      console.error('Error deleting reward:', error);
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_CACHE_KEY] });
    }
  });

  // Buy a reward
  const buyRewardMutation = useMutation({
    mutationFn: async ({ id, cost }: { id: string, cost: number }): Promise<Reward> => {
      // First, get the current user's points
      const { data: userData, error: userError } = await supabase
        .from('user_points')
        .select('points')
        .single();
        
      if (userError) throw userError;
      
      if (userData.points < cost) {
        throw new Error('Not enough points');
      }
      
      // Update the user's points
      const { error: pointsError } = await supabase
        .from('user_points')
        .update({ points: userData.points - cost })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
      if (pointsError) throw pointsError;
      
      // Update the reward supply
      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .update({ supply: supabase.rpc('increment', { inc: 1 }) })
        .eq('id', id)
        .select()
        .single();
        
      if (rewardError) throw rewardError;
      
      return rewardData as Reward;
    },
    onSuccess: (updatedReward) => {
      queryClient.setQueryData(
        [REWARDS_CACHE_KEY],
        (oldData: Reward[] = []) => oldData.map(reward => 
          reward.id === updatedReward.id ? updatedReward : reward
        )
      );
      
      // Also invalidate user points
      queryClient.invalidateQueries({ queryKey: ['user_points'] });
      
      toast({
        title: "Success",
        description: `You purchased ${updatedReward.title}`,
      });
    },
    onError: (error) => {
      console.error('Error buying reward:', error);
      
      if (error instanceof Error && error.message === 'Not enough points') {
        toast({
          title: "Not Enough Points",
          description: "You don't have enough points to buy this reward.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to purchase reward. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  // Use a reward
  const useRewardMutation = useMutation({
    mutationFn: async (id: string): Promise<Reward> => {
      // Get the current reward
      const { data: rewardData, error: rewardGetError } = await supabase
        .from('rewards')
        .select('*')
        .eq('id', id)
        .single();
        
      if (rewardGetError) throw rewardGetError;
      
      if (rewardData.supply <= 0) {
        throw new Error('No supply available');
      }
      
      // Update the reward supply
      const { data: updatedReward, error: rewardUpdateError } = await supabase
        .from('rewards')
        .update({ supply: rewardData.supply - 1 })
        .eq('id', id)
        .select()
        .single();
        
      if (rewardUpdateError) throw rewardUpdateError;
      
      // Record usage
      const today = new Date();
      const { error: usageError } = await supabase
        .from('reward_usage')
        .insert({
          reward_id: id,
          day_of_week: today.getDay(),
          week_number: `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`,
          used: true
        });
        
      if (usageError) {
        console.error('Error recording reward usage:', usageError);
      }
      
      return updatedReward as Reward;
    },
    onSuccess: (updatedReward) => {
      queryClient.setQueryData(
        [REWARDS_CACHE_KEY],
        (oldData: Reward[] = []) => oldData.map(reward => 
          reward.id === updatedReward.id ? updatedReward : reward
        )
      );
      
      toast({
        title: "Success",
        description: `You used ${updatedReward.title}`,
      });
    },
    onError: (error) => {
      console.error('Error using reward:', error);
      
      if (error instanceof Error && error.message === 'No supply available') {
        toast({
          title: "No Supply",
          description: "You don't have any of this reward to use.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to use reward. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  return {
    rewards,
    isLoading,
    error,
    createReward: (data: Partial<Reward>) => createRewardMutation.mutateAsync(data),
    updateReward: (id: string, data: Partial<Reward>) => updateRewardMutation.mutateAsync({ id, ...data }),
    deleteReward: (id: string) => deleteRewardMutation.mutateAsync(id),
    buyReward: (id: string, cost: number) => buyRewardMutation.mutateAsync({ id, cost }),
    useReward: (id: string) => useRewardMutation.mutateAsync(id),
    refetchRewards: () => queryClient.invalidateQueries({ queryKey: [REWARDS_CACHE_KEY] })
  };
};
