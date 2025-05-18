import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useBuySubReward } from "./rewards/mutations/useBuySubReward";
import { useBuyDomReward } from "./rewards/mutations/useBuyDomReward";
import { useRedeemSubReward } from "./rewards/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "./rewards/mutations/useRedeemDomReward";
import { useCreateReward } from "./rewards/mutations/useCreateReward";
import { useUpdateReward } from "./rewards/mutations/useUpdateReward";
import { useDeleteReward } from "./rewards/mutations/useDeleteReward";

// Keys for our queries
const REWARDS_QUERY_KEY = ['rewards'];
const POINTS_QUERY_KEY = ['profile_points'];
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
  is_dom_reward?: boolean;
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
  
  return data.map(reward => ({ ...reward, is_dom_reward: !!reward.is_dom_reward })) as Reward[];
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
    // If profile doesn't exist or other error, return 0 or handle as appropriate
    console.warn('Error fetching user points, possibly profile not found:', error.message);
    return 0;
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

// The main hook to expose all reward-related operations
export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();
  const { mutateAsync: createReward } = useCreateReward();
  const { mutateAsync: updateReward } = useUpdateReward();
  const { mutateAsync: deleteRewardMutation } = useDeleteReward();

  // Query for fetching all rewards
  const {
    data: rewards = [],
    isLoading,
    error,
    refetch: refetchRewards
  } = useQuery<Reward[], Error>({
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
  } = useQuery<number, Error>({
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
  } = useQuery<number, Error>({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Wrapper function for saving a reward (create or update)
  const saveRewardOperation = async ({ rewardData }: { rewardData: Partial<Reward>}) => {
    try {
      console.log("Save reward called with data:", rewardData);
      
      if (rewardData.id) {
        // Update existing reward
        const { id, ...updates } = rewardData;
        // Ensure 'id' is correctly passed as part of the variables for updateReward
        const variables = { id, ...updates }; 
        return await updateReward(variables);
      } else {
        // Create new reward
        const { id, created_at, updated_at, ...creatableData } = rewardData;
        // Add required fields if missing
        const variables = {
          title: creatableData.title || 'New Reward',
          cost: creatableData.cost || 0,
          supply: creatableData.supply || 0,
          description: creatableData.description || null,
          background_image_url: creatableData.background_image_url || null,
          background_opacity: creatableData.background_opacity || 100,
          icon_name: creatableData.icon_name || null,
          icon_color: creatableData.icon_color || '#9b87f5',
          title_color: creatableData.title_color || '#FFFFFF',
          subtext_color: creatableData.subtext_color || '#8E9196',
          calendar_color: creatableData.calendar_color || '#7E69AB',
          highlight_effect: creatableData.highlight_effect || false,
          focal_point_x: creatableData.focal_point_x || 50,
          focal_point_y: creatableData.focal_point_y || 50,
          is_dom_reward: creatableData.is_dom_reward || false,
        };
        return await createReward(variables);
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
  const deleteRewardOperation = async (rewardId: string): Promise<void> => { // Changed return to void as delete mutation returns void
    try {
      await deleteRewardMutation(rewardId);
      // Toasting is handled by the useDeleteReward hook
    } catch (error) {
      console.error('Error deleting reward:', error);
      // Toasting is handled by the useDeleteReward hook, but can add specific page context error here if needed
      toast({
        title: 'Error on Page',
        description: 'Failed to delete reward. Please try again from the rewards page.',
        variant: 'destructive',
      });
      throw error; // Re-throw
    }
  };

  // Function to manually refresh points from database
  const refreshPointsFromDatabase = async () => {
    try {
      await refetchPoints();
      await refetchSupply(); // Supply might change if rewards are deleted/added by others
      await refetchRewards(); // Also refetch rewards themselves
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
    saveReward: saveRewardOperation,
    deleteReward: deleteRewardOperation,
    buyReward: async ({ rewardId, cost }: { rewardId: string, cost: number }) => {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) throw new Error("User not authenticated");
      
      const profileId = userData.user.id;
      // Fetch current points from cache or state, as totalPoints might be stale
      const currentPointsQueryData = queryClient.getQueryData<{ points?: number, dom_points?: number }>(POINTS_QUERY_KEY);
      const currentPoints = currentPointsQueryData?.points ?? totalPoints;
      const currentDomPoints = currentPointsQueryData?.dom_points ?? 0;

      if (reward.is_dom_reward) {
        return buyDom({
          rewardId,
          cost,
          currentSupply: reward.supply,
          profileId,
          currentDomPoints
        });
      } else {
        return buySub({
          rewardId,
          cost,
          currentSupply: reward.supply,
          profileId,
          currentPoints
        });
      }
    },
    
    // Refetch functions
    refetchRewards,
    refetchPoints,
    refreshPointsFromDatabase
  };
};
