
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useBuySubReward } from "@/data/mutations/useBuySubReward";
import { useBuyDomReward } from "@/data/mutations/useBuyDomReward";
import { useRedeemSubReward } from "@/data/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "@/data/mutations/useRedeemDomReward";
import { useCreateReward } from "@/data/mutations/useCreateReward";
import { useUpdateReward } from "@/data/mutations/useUpdateReward";
import { useDeleteReward } from "@/data/mutations/useDeleteReward";

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

// The main hook to expose all reward-related operations
export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();
  const { mutateAsync: createReward } = useCreateReward();
  const { mutateAsync: updateReward } = useUpdateReward();
  const { mutateAsync: deleteReward } = useDeleteReward();

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

  // Wrapper function for saving a reward (create or update)
  const saveReward = async ({ rewardData, currentIndex }: { rewardData: Partial<Reward>, currentIndex?: number | null }) => {
    try {
      console.log("Save reward called with data:", rewardData);
      
      if (rewardData.id) {
        // Update existing reward
        const updates = {
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
          updated_at: new Date().toISOString(),
          is_dom_reward: Boolean((rewardData as Reward).is_dom_reward)
        };
        
        await updateReward({ rewardId: rewardData.id, updates });
        return await queryClient.fetchQuery({ queryKey: ["rewards", rewardData.id] });
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
          is_dom_reward: Boolean((rewardData as Reward).is_dom_reward),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const created = await createReward(newReward);
        return created;
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to save reward. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Wrapper function for deleting a reward
  const deleteRewardFromDb = async (rewardId: string): Promise<boolean> => {
    try {
      await deleteReward(rewardId);
      return true;
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reward. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

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
    saveReward,
    deleteReward: deleteRewardFromDb,
    buyReward: async ({ rewardId, cost }: { rewardId: string, cost: number }) => {
      // Get the reward to get its supply
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      
      // Get the user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) throw new Error("User not authenticated");
      
      // Check if it's a dom reward
      if ((reward as Reward).is_dom_reward) {
        return buyDom({
          rewardId,
          cost,
          currentSupply: reward.supply,
          profileId: userData.user.id,
          currentDomPoints: queryClient.getQueryData<any>(["profile_points"])?.dom_points || 0
        });
      } else {
        return buySub({
          rewardId,
          cost,
          currentSupply: reward.supply,
          profileId: userData.user.id,
          currentPoints: queryClient.getQueryData<any>(["profile_points"])?.points || 0
        });
      }
    },
    
    // Refetch functions
    refetchRewards,
    refetchPoints,
    refreshPointsFromDatabase
  };
};
