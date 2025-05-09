
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Keys for our queries
const REWARDS_QUERY_KEY = ['rewards'];
const POINTS_QUERY_KEY = ['rewards', 'points'];
const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

// Define the Reward type
export interface Reward {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  supply: number;
  background_image_url?: string | null;
  background_opacity: number;
  icon_name?: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  created_at?: string;
  updated_at?: string;
}

// Fetch rewards from the database
const fetchRewards = async (): Promise<Reward[]> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rewards:', error);
    throw error;
  }
  
  return data;
};

// Fetch user points from the database
const fetchUserPoints = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    // User is not logged in
    return 0;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user points:', error);
    throw error;
  }
  
  return data?.points || 0;
};

// Fetch the total rewards supply
const fetchTotalRewardsSupply = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply');
  
  if (error) {
    console.error('Error fetching total rewards supply:', error);
    throw error;
  }
  
  return data.reduce((total, reward) => total + reward.supply, 0);
};

// Save a reward to the database
const saveRewardToDb = async (rewardData: Partial<Reward>, currentIndex?: number | null): Promise<Reward> => {
  if (rewardData.id) {
    // Update existing reward
    const { data, error } = await supabase
      .from('rewards')
      .update({
        title: rewardData.title,
        description: rewardData.description,
        cost: rewardData.cost,
        supply: rewardData.supply,
        background_image_url: rewardData.background_image_url,
        background_opacity: rewardData.background_opacity,
        icon_name: rewardData.icon_name,
        icon_color: rewardData.icon_color,
        title_color: rewardData.title_color,
        subtext_color: rewardData.subtext_color,
        calendar_color: rewardData.calendar_color,
        highlight_effect: rewardData.highlight_effect,
        focal_point_x: rewardData.focal_point_x,
        focal_point_y: rewardData.focal_point_y,
        updated_at: new Date().toISOString()
      })
      .eq('id', rewardData.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating reward:', error);
      throw error;
    }
    
    return data;
  } else {
    // Create new reward
    const newReward = {
      title: rewardData.title || 'New Reward',
      description: rewardData.description || '',
      cost: rewardData.cost || 10,
      supply: rewardData.supply || 0,
      background_image_url: rewardData.background_image_url,
      background_opacity: rewardData.background_opacity || 100,
      icon_name: rewardData.icon_name,
      icon_color: rewardData.icon_color || '#9b87f5',
      title_color: rewardData.title_color || '#FFFFFF',
      subtext_color: rewardData.subtext_color || '#8E9196',
      calendar_color: rewardData.calendar_color || '#7E69AB',
      highlight_effect: rewardData.highlight_effect || false,
      focal_point_x: rewardData.focal_point_x || 50,
      focal_point_y: rewardData.focal_point_y || 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('rewards')
      .insert(newReward)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating reward:', error);
      throw error;
    }
    
    return data;
  }
};

// Delete a reward from the database
const deleteRewardFromDb = async (rewardId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId);
  
  if (error) {
    console.error('Error deleting reward:', error);
    throw error;
  }
  
  return true;
};

// Buy a reward with user points
const buyRewardInDb = async (rewardId: string, cost: number): Promise<{ success: boolean, newPoints: number }> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    throw new Error('User is not logged in');
  }
  
  // First, check user points
  const { data: userPoints, error: pointsError } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();
  
  if (pointsError) {
    console.error('Error fetching user points:', pointsError);
    throw pointsError;
  }
  
  if (!userPoints || userPoints.points < cost) {
    throw new Error('Not enough points to buy this reward');
  }
  
  // Then, check if reward is available
  const { data: reward, error: rewardError } = await supabase
    .from('rewards')
    .select('supply')
    .eq('id', rewardId)
    .single();
  
  if (rewardError) {
    console.error('Error fetching reward:', rewardError);
    throw rewardError;
  }
  
  if (reward.supply <= 0) {
    throw new Error('Reward is out of stock');
  }
  
  // Start a transaction by updating both tables
  // First, deduct points
  const newPoints = userPoints.points - cost;
  const { error: updatePointsError } = await supabase
    .from('profiles')
    .update({ points: newPoints })
    .eq('id', userId);
  
  if (updatePointsError) {
    console.error('Error updating points:', updatePointsError);
    throw updatePointsError;
  }
  
  // Then, decrement reward supply
  const { error: updateSupplyError } = await supabase
    .from('rewards')
    .update({ 
      supply: reward.supply - 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', rewardId);
  
  if (updateSupplyError) {
    console.error('Error updating reward supply:', updateSupplyError);
    // Try to revert the points update on error
    await supabase
      .from('profiles')
      .update({ points: userPoints.points })
      .eq('id', userId);
    throw updateSupplyError;
  }
  
  // Record usage
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
  
  const { error: usageError } = await supabase
    .from('reward_usage')
    .insert({
      reward_id: rewardId,
      day_of_week: dayOfWeek,
      used: true,
      week_number: weekNumber
    });
  
  if (usageError) {
    console.error('Error recording reward usage:', usageError);
    // Continue despite usage recording error
  }
  
  return { success: true, newPoints };
};

// The main hook to expose all reward-related operations
export const useRewardsData = () => {
  const queryClient = useQueryClient();

  // Query for fetching all rewards
  const {
    data: rewards = [],
    isLoading,
    error,
    refetch: refetchRewards
  } = useQuery({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Query for fetching user points
  const {
    data: totalPoints = 0,
    refetch: refetchPoints
  } = useQuery({
    queryKey: POINTS_QUERY_KEY,
    queryFn: fetchUserPoints,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Query for fetching total rewards supply
  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Mutation for saving a reward (create or update)
  const saveRewardMutation = useMutation({
    mutationFn: ({ rewardData, currentIndex }: { rewardData: Partial<Reward>, currentIndex?: number | null }) => 
      saveRewardToDb(rewardData, currentIndex),
    onMutate: async ({ rewardData, currentIndex }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      
      // Snapshot the previous value
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
      
      // Optimistically update the cache with the new reward
      if (rewardData.id) {
        // Updating existing reward
        queryClient.setQueryData<Reward[]>(
          REWARDS_QUERY_KEY, 
          previousRewards.map(r => 
            r.id === rewardData.id 
              ? { ...r, ...rewardData, updated_at: new Date().toISOString() } 
              : r
          )
        );
      } else {
        // Creating new reward
        const tempId = `temp-${Date.now()}`;
        const optimisticReward: Reward = {
          id: tempId,
          title: rewardData.title || 'New Reward',
          description: rewardData.description || '',
          cost: rewardData.cost || 10,
          supply: rewardData.supply || 0,
          background_image_url: rewardData.background_image_url,
          background_opacity: rewardData.background_opacity || 100,
          icon_name: rewardData.icon_name,
          icon_color: rewardData.icon_color || '#9b87f5',
          title_color: rewardData.title_color || '#FFFFFF',
          subtext_color: rewardData.subtext_color || '#8E9196',
          calendar_color: rewardData.calendar_color || '#7E69AB',
          highlight_effect: rewardData.highlight_effect || false,
          focal_point_x: rewardData.focal_point_x || 50,
          focal_point_y: rewardData.focal_point_y || 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        queryClient.setQueryData<Reward[]>(
          REWARDS_QUERY_KEY, 
          [optimisticReward, ...previousRewards]
        );
      }
      
      return { previousRewards };
    },
    onError: (err, variables, context) => {
      console.error('Error saving reward:', err);
      toast({
        title: 'Error',
        description: 'Failed to save reward. Please try again.',
        variant: 'destructive',
      });
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
    }
  });

  // Mutation for deleting a reward
  const deleteRewardMutation = useMutation({
    mutationFn: deleteRewardFromDb,
    onMutate: async (rewardId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      
      // Snapshot the previous value
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
      
      // Optimistically update the cache by removing the deleted reward
      queryClient.setQueryData<Reward[]>(
        REWARDS_QUERY_KEY, 
        previousRewards.filter(r => r.id !== rewardId)
      );
      
      return { previousRewards };
    },
    onError: (err, rewardId, context) => {
      console.error('Error deleting reward:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete reward. Please try again.',
        variant: 'destructive',
      });
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
    }
  });

  // Mutation for buying a reward
  const buyRewardMutation = useMutation({
    mutationFn: ({ rewardId, cost }: { rewardId: string, cost: number }) => 
      buyRewardInDb(rewardId, cost),
    onMutate: async ({ rewardId, cost }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: POINTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      
      // Snapshot the previous values
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
      const previousPoints = queryClient.getQueryData<number>(POINTS_QUERY_KEY) || 0;
      const previousSupply = queryClient.getQueryData<number>(REWARDS_SUPPLY_QUERY_KEY) || 0;
      
      // Optimistically update the reward supply
      const updatedRewards = previousRewards.map(r => {
        if (r.id === rewardId) {
          return { ...r, supply: Math.max(0, r.supply - 1) };
        }
        return r;
      });
      
      queryClient.setQueryData(REWARDS_QUERY_KEY, updatedRewards);
      
      // Optimistically update the points
      const newPoints = Math.max(0, previousPoints - cost);
      queryClient.setQueryData(POINTS_QUERY_KEY, newPoints);
      
      // Optimistically update the total supply
      queryClient.setQueryData(REWARDS_SUPPLY_QUERY_KEY, Math.max(0, previousSupply - 1));
      
      return { 
        previousRewards, 
        previousPoints,
        previousSupply
      };
    },
    onError: (err, variables, context) => {
      console.error('Error buying reward:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to buy reward. Please try again.',
        variant: 'destructive',
      });
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
        queryClient.setQueryData(POINTS_QUERY_KEY, context.previousPoints);
        queryClient.setQueryData(REWARDS_SUPPLY_QUERY_KEY, context.previousSupply);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
    }
  });

  // Function to manually refresh points from database
  const refreshPointsFromDatabase = async () => {
    try {
      await refetchPoints();
      await refetchSupply();
    } catch (error) {
      console.error('Error refreshing points from database:', error);
    }
  };

  return {
    // Data
    rewards,
    totalPoints,
    totalRewardsSupply,
    
    // Loading state
    isLoading,
    error,
    
    // Rewards CRUD operations
    saveReward: (rewardData: Partial<Reward>, currentIndex?: number | null) => 
      saveRewardMutation.mutateAsync({ rewardData, currentIndex }),
    deleteReward: (rewardId: string) => 
      deleteRewardMutation.mutateAsync(rewardId),
    buyReward: (rewardId: string, cost: number) => 
      buyRewardMutation.mutateAsync({ rewardId, cost }),
    
    // Refetch functions
    refetchRewards,
    refetchPoints,
    refreshPointsFromDatabase
  };
};
