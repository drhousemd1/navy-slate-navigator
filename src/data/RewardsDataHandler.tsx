import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Corrected import for mutation hooks based on their actual location in data/rewards/mutations
import { useCreateRewardMutation as useCreateReward, useUpdateRewardMutation as useUpdateReward, useDeleteRewardMutation } from "./rewards/mutations"; 

// These are specific item interaction mutations, likely from data/mutations/
import { useBuySubReward } from "./mutations/useBuySubReward";
import { useBuyDomReward } from "./mutations/useBuyDomReward";
import { useRedeemSubReward } from "./mutations/useRedeemSubReward";
import { useRedeemDomReward } from "./mutations/useRedeemDomReward";

// Keys for our queries
const REWARDS_QUERY_KEY = ['rewards'];
const POINTS_QUERY_KEY = ['profile_points']; // This should align with REWARDS_POINTS_QUERY_KEY from rewards/queries
const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

// Import Reward type from the centralized location
import { Reward, CreateRewardVariables, UpdateRewardVariables } from "./rewards/types";

// Fetch rewards from the database (aligns with fetchRewards in rewards/queries.ts)
const fetchRewards = async (): Promise<Reward[]> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rewards:', error);
    throw error;
  }
  // Ensure is_dom_reward is always a boolean
  return data.map(reward => ({ ...reward, is_dom_reward: !!reward.is_dom_reward })) as Reward[];
};

// Fetch user points (aligns with fetchUserPoints in rewards/queries.ts)
const fetchUserPoints = async (): Promise<{ points: number, dom_points: number }> => { // Return both points
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) return { points: 0, dom_points: 0 };
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points, dom_points')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.warn('Error fetching user points, possibly profile not found:', error.message);
    return { points: 0, dom_points: 0 };
  }
  
  return { points: data?.points || 0, dom_points: data?.dom_points || 0 };
};

const fetchTotalRewardsSupply = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply');
  
  if (error) {
    console.error('Error fetching total rewards supply:', error);
    throw error;
  }
  
  return data.reduce((total, reward) => total + (reward.supply || 0), 0);
};

export const useRewardsDataHandler = () => { // Renamed hook to avoid conflict if used elsewhere
  const queryClient = useQueryClient();
  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();
  const { mutateAsync: createReward } = useCreateReward();
  const { mutateAsync: updateReward } = useUpdateReward();
  // Corrected: useDeleteRewardMutation is the hook itself
  const deleteRewardMutationHook = useDeleteRewardMutation();

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
    data: pointsData = { points: 0, dom_points: 0 }, // Ensure pointsData is initialized
    refetch: refetchPoints
  } = useQuery<{ points: number, dom_points: number }, Error>({
    queryKey: POINTS_QUERY_KEY,
    queryFn: fetchUserPoints,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });
  const totalPoints = pointsData.points;
  const domPoints = pointsData.dom_points;

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
  const saveRewardOperation = async (saveData: { rewardData: Partial<Reward> & { id?: string }}) => {
    const { rewardData } = saveData;
    console.log("Save reward called with data:", rewardData);
    try {
      if (rewardData.id) {
        // Update: Ensure type compatibility with UpdateRewardVariables
        const updateVariables: UpdateRewardVariables = { id: rewardData.id, ...rewardData };
        return await updateReward(updateVariables);
      } else {
        // Create: Ensure type compatibility with CreateRewardVariables
        // Explicitly check for required fields for creation
        if (rewardData.title === undefined || rewardData.cost === undefined || rewardData.supply === undefined || rewardData.is_dom_reward === undefined) {
          throw new Error("Missing required fields (title, cost, supply, is_dom_reward) for creating reward.");
        }
        const createVariables: CreateRewardVariables = {
          title: rewardData.title,
          cost: rewardData.cost,
          supply: rewardData.supply,
          is_dom_reward: rewardData.is_dom_reward,
          description: rewardData.description || null,
          background_image_url: rewardData.background_image_url || null,
          background_opacity: rewardData.background_opacity || 100,
          icon_name: rewardData.icon_name || null,
          icon_color: rewardData.icon_color || '#9b87f5',
          title_color: rewardData.title_color || '#FFFFFF',
          subtext_color: rewardData.subtext_color || '#8E9196',
          calendar_color: rewardData.calendar_color || '#7E69AB',
          highlight_effect: rewardData.highlight_effect || false,
          focal_point_x: rewardData.focal_point_x || 50,
          focal_point_y: rewardData.focal_point_y || 50,
          icon_url: rewardData.icon_url || null, // Added missing icon_url
        };
        return await createReward(createVariables);
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        title: 'Error',
        description: `Failed to save reward: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Wrapper function for deleting a reward
  const deleteRewardOperation = async (rewardId: string): Promise<void> => {
    try {
      // use the mutateAsync from the hook
      await deleteRewardMutationHook.mutateAsync(rewardId);
    } catch (error) {
      // ... keep existing code (error handling)
      console.error('Error deleting reward:', error);
      toast({
        title: 'Error on Page',
        description: 'Failed to delete reward. Please try again from the rewards page.',
        variant: 'destructive',
      });
      throw error; 
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
  
  // Buy a reward (either sub or dom based on reward type)
  const buyReward = async ({ rewardId, cost }: { rewardId: string; cost: number }) => {
    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) throw new Error("User not authenticated");
      
      const profileId = userData.user.id;
      // Use pointsData from the query, not passed-in totalPoints/domPoints
      const currentPoints = pointsData.points; 
      const currentDomPoints = pointsData.dom_points;

      if (reward.is_dom_reward) {
        return await buyDom({
          rewardId,
          cost,
          currentSupply: reward.supply,
          profileId,
          currentDomPoints
        });
      } else {
        return await buySub({
          rewardId,
          cost,
          currentSupply: reward.supply,
          profileId,
          currentPoints
        });
      }
    } catch (error) {
      console.error('Error buying reward:', error);
      throw error;
    }
  };
  
  // Redeem a reward (either sub or dom based on reward type)
  const redeemReward = async ({ rewardId }: { rewardId: string }) => {
    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error("Reward not found");
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) throw new Error("User not authenticated");
      
      const profileId = userData.user.id;
      
      if (reward.is_dom_reward) {
        return await redeemDom({
          rewardId,
          currentSupply: reward.supply,
          profileId
        });
      } else {
        return await redeemSub({
          rewardId,
          currentSupply: reward.supply,
          profileId
        });
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  };

  return {
    // Data
    rewards,
    totalPoints, // derived from pointsData
    domPoints,   // derived from pointsData
    totalRewardsSupply,
    
    // Loading state
    isLoading,
    error,
    
    // Rewards CRUD operations
    saveReward: saveRewardOperation,
    deleteReward: deleteRewardOperation,
    buyReward,
    redeemReward, // Renamed from useReward for clarity to match internal calls
    
    // Refetch functions
    refetchRewards,
    refetchPoints,
    refreshPointsFromDatabase
  };
};
