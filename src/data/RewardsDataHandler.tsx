
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBuySubReward } from "@/data/mutations/useBuySubReward";
import { useBuyDomReward } from "@/data/mutations/useBuyDomReward";
import { useRedeemSubReward } from "@/data/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "@/data/mutations/useRedeemDomReward";

// Keys for our queries
const REWARDS_QUERY_KEY = ['rewards'];
const POINTS_QUERY_KEY = ['rewards', 'points'];
const DOM_POINTS_QUERY_KEY = ['rewards', 'dom_points'];
const REWARDS_SUPPLY_QUERY_KEY = ['totalRewardsSupply'];
const DOM_REWARDS_SUPPLY_QUERY_KEY = ['totalDomRewardsSupply'];

// Define the Reward type
export interface Reward {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  supply: number;
  is_dom_reward: boolean;
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

// Fetch dom points from the database
const fetchUserDomPoints = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    // User is not logged in
    return 0;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('dom_points')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user dom points:', error);
    throw error;
  }
  
  return data?.dom_points || 0;
};

// Fetch the total rewards supply
const fetchTotalRewardsSupply = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply, is_dom_reward');
  
  if (error) {
    console.error('Error fetching total rewards supply:', error);
    throw error;
  }
  
  return data.filter(reward => !reward.is_dom_reward).reduce((total, reward) => total + reward.supply, 0);
};

// Fetch the total dom rewards supply
const fetchTotalDomRewardsSupply = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply, is_dom_reward');
  
  if (error) {
    console.error('Error fetching total dom rewards supply:', error);
    throw error;
  }
  
  return data.filter(reward => reward.is_dom_reward).reduce((total, reward) => total + reward.supply, 0);
};

// The main hook to expose all reward-related operations
export const useRewardsData = () => {
  const { user } = useAuth();
  const profileId = user?.id;
  const queryClientHook = useQueryClient();

  // Use the new mutation hooks
  const { mutateAsync: buySubReward } = useBuySubReward();
  const { mutateAsync: buyDomReward } = useBuyDomReward();
  const { mutateAsync: redeemSubReward } = useRedeemSubReward();
  const { mutateAsync: redeemDomReward } = useRedeemDomReward();

  // Query for fetching all rewards
  const {
    data: rewards = [],
    isLoading,
    error,
    refetch: refetchRewards
  } = useQuery({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    staleTime: Infinity,
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
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Query for fetching dom points
  const {
    data: domPoints = 0,
    refetch: refetchDomPoints
  } = useQuery({
    queryKey: DOM_POINTS_QUERY_KEY,
    queryFn: fetchUserDomPoints,
    staleTime: Infinity,
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
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Query for fetching total dom rewards supply
  const {
    data: totalDomRewardsSupply = 0,
    refetch: refetchDomSupply
  } = useQuery({
    queryKey: DOM_REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalDomRewardsSupply,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Function to handle buying a reward
  const buyReward = async ({ rewardId, cost, isDomReward = false }: { rewardId: string; cost: number; isDomReward?: boolean }) => {
    if (!profileId) {
      toast({
        title: "Error",
        description: "You must be logged in to buy rewards",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the reward in the current list
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) {
        throw new Error("Reward not found");
      }

      // Use the appropriate mutation based on whether it's a dom reward
      if (isDomReward) {
        await buyDomReward({
          rewardId: reward.id,
          cost: cost,
          currentSupply: reward.supply,
          profileId,
          currentDomPoints: domPoints
        });
      } else {
        await buySubReward({
          rewardId: reward.id,
          cost: cost,
          currentSupply: reward.supply,
          profileId,
          currentPoints: totalPoints
        });
      }

      toast({
        title: "Reward Purchased",
        description: `You purchased ${reward.title}`,
      });
    } catch (error) {
      console.error("Error buying reward:", error);
      
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to buy reward. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Function to handle using a reward
  const useReward = async (rewardId: string) => {
    if (!profileId) {
      toast({
        title: "Error",
        description: "You must be logged in to use rewards",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the reward in the current list
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) {
        throw new Error("Reward not found");
      }

      if (reward.supply <= 0) {
        throw new Error("You don't have any of this reward to use");
      }

      // Use the appropriate mutation based on whether it's a dom reward
      if (reward.is_dom_reward) {
        await redeemDomReward({
          rewardId: reward.id,
          currentSupply: reward.supply,
          profileId
        });
      } else {
        await redeemSubReward({
          rewardId: reward.id,
          currentSupply: reward.supply,
          profileId
        });
      }

      toast({
        title: "Reward Used",
        description: `You used ${reward.title}`,
      });
    } catch (error) {
      console.error("Error using reward:", error);
      
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
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
  };

  // Function to manually refresh points from database
  const refreshPointsFromDatabase = async () => {
    try {
      await refetchPoints();
      await refetchDomPoints();
      await refetchSupply();
      await refetchDomSupply();
    } catch (error) {
      console.error('Error refreshing points from database:', error);
    }
  };

  const saveRewardMutation = useMutation({
    mutationFn: ({ rewardData, currentIndex }: { rewardData: Partial<Reward>, currentIndex?: number | null }) => 
      saveRewardToDb(rewardData, currentIndex),
    onMutate: async ({ rewardData, currentIndex }) => {
      // Cancel any outgoing refetches
      await queryClientHook.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      
      // Snapshot the previous value
      const previousRewards = queryClientHook.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
      
      // Optimistically update the cache with the new reward
      if (rewardData.id) {
        // Updating existing reward
        queryClientHook.setQueryData<Reward[]>(
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
          is_dom_reward: rewardData.is_dom_reward || false,
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
        
        queryClientHook.setQueryData<Reward[]>(
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
        queryClientHook.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClientHook.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClientHook.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      queryClientHook.invalidateQueries({ queryKey: DOM_REWARDS_SUPPLY_QUERY_KEY });
    }
  });

  const deleteRewardMutation = useMutation({
    mutationFn: deleteRewardFromDb,
    onMutate: async (rewardId) => {
      // Cancel any outgoing refetches
      await queryClientHook.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      
      // Snapshot the previous value
      const previousRewards = queryClientHook.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
      
      // Optimistically update the cache by removing the deleted reward
      queryClientHook.setQueryData<Reward[]>(
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
        queryClientHook.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClientHook.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClientHook.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      queryClientHook.invalidateQueries({ queryKey: DOM_REWARDS_SUPPLY_QUERY_KEY });
    }
  });

  // For optimistic UI updates
  const setRewardsOptimistically = (updatedRewards: Reward[]) => {
    queryClientHook.setQueryData(REWARDS_QUERY_KEY, updatedRewards);
  };
  
  const setPointsOptimistically = (points: number) => {
    queryClientHook.setQueryData(POINTS_QUERY_KEY, points);
  };
  
  const setDomPointsOptimistically = (points: number) => {
    queryClientHook.setQueryData(DOM_POINTS_QUERY_KEY, points);
  };

  return {
    // Data
    rewards,
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints,
    
    // Loading state
    isLoading,
    error,
    
    // Rewards CRUD operations
    saveReward: (rewardData: Partial<Reward>, currentIndex?: number | null) => 
      saveRewardMutation.mutateAsync({ rewardData, currentIndex }),
    deleteReward: (rewardId: string) => 
      deleteRewardMutation.mutateAsync(rewardId),
    buyReward,
    useReward,
    
    // Points operations
    updatePoints: async (points: number) => {
      // Implementation will be moved to usePointsManagement
    },
    updateDomPoints: async (points: number) => {
      // Implementation will be moved to usePointsManagement
    },
    
    // Refetch functions
    refetchRewards,
    refetchPoints,
    refreshPointsFromDatabase,
    
    // Optimistic update helpers
    setRewardsOptimistically,
    setPointsOptimistically,
    setDomPointsOptimistically,
  };
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
        is_dom_reward: rewardData.is_dom_reward,
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
      is_dom_reward: rewardData.is_dom_reward || false,
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
