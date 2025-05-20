import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward, CreateRewardVariables, UpdateRewardVariables } from './types';
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  REWARDS_SUPPLY_QUERY_KEY
} from './queries';
import { 
  fetchRewards, 
  fetchUserPoints, 
  fetchUserDomPoints, 
  fetchTotalRewardsSupply 
} from './queries';
import { 
  useCreateRewardMutation, 
  useUpdateRewardMutation 
} from './mutations/useSaveReward';
import { useDeleteReward as useDeleteRewardMutation } from './mutations/useDeleteReward';
import { toast } from '@/hooks/use-toast';
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { data: authUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: Infinity,
  });
  const profileId = authUser?.id;

  const { 
    data: rewards = [], 
    isLoading: isRewardsLoading, 
    refetch: refetchRewards 
  } = useQuery<Reward[]>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
  });

  const { data: totalPoints = 0, isLoading: isPointsLoading } = useQuery<number>({
    queryKey: getProfilePointsQueryKey(profileId, 'points'),
    queryFn: () => fetchUserPoints(profileId),
    enabled: !!profileId,
  });

  const { data: domPoints = 0, isLoading: isDomPointsLoading } = useQuery<number>({
    queryKey: getProfilePointsQueryKey(profileId, 'dom_points'),
    queryFn: () => fetchUserDomPoints(profileId),
    enabled: !!profileId,
  });
  
  const { data: totalRewardsSupply = 0, isLoading: isSupplyLoading } = useQuery<number>({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
  });

  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMutation = useDeleteRewardMutation();

  const totalDomRewardsSupply = rewards
    .filter(reward => reward.is_dom_reward)
    .reduce((total, reward) => total + (reward.supply === -1 ? 0 : reward.supply), 0);
    
  const isLoading = isRewardsLoading || isPointsLoading || isDomPointsLoading || isSupplyLoading || !profileId;

  const saveReward = async (rewardData: Partial<Reward>): Promise<Reward | null> => {
    try {
      if (rewardData.id) {
        // Update existing reward
        const updateVariables: UpdateRewardVariables = {
          id: rewardData.id,
          ...rewardData,
        };
        return await updateRewardMutation.mutateAsync(updateVariables);
      } else {
        // Create new reward
        if (!rewardData.title || typeof rewardData.cost !== 'number' || typeof rewardData.supply !== 'number' || typeof rewardData.is_dom_reward !== 'boolean') {
          toast({ 
            title: "Missing required fields", 
            description: "Title, cost, supply, and DOM status are required.", 
            variant: "destructive" 
          });
          return null;
        }
        
        const createVariables: CreateRewardVariables = {
          title: rewardData.title,
          cost: rewardData.cost,
          supply: rewardData.supply,
          is_dom_reward: rewardData.is_dom_reward,
          description: rewardData.description || null,
          background_image_url: rewardData.background_image_url || null,
          background_opacity: rewardData.background_opacity ?? 100, 
          icon_name: rewardData.icon_name || 'Award', 
          icon_url: rewardData.icon_url || null,
          icon_color: rewardData.icon_color || '#9b87f5', 
          title_color: rewardData.title_color || '#FFFFFF', 
          subtext_color: rewardData.subtext_color || '#8E9196', 
          calendar_color: rewardData.calendar_color || '#7E69AB', 
          highlight_effect: rewardData.highlight_effect ?? false, 
          focal_point_x: rewardData.focal_point_x ?? 50, 
          focal_point_y: rewardData.focal_point_y ?? 50, 
        };
        
        return await createRewardMutation.mutateAsync(createVariables);
      }
    } catch (error) {
      console.error("Error in saveReward (useRewardsData):", error);
      toast({ title: "Save Error", description: error instanceof Error ? error.message : "Could not save reward.", variant: "destructive" });
      return null;
    }
  };

  const deleteReward = async (rewardId: string): Promise<boolean> => {
    try {
      await deleteRewardMutation.mutateAsync(rewardId);
      return true;
    } catch (error) {
      console.error("Error in deleteReward (useRewardsData):", error);
      toast({ title: "Delete Error", description: error instanceof Error ? error.message : "Could not delete reward.", variant: "destructive" });
      return false;
    }
  };
  
  const refreshPoints = async () => {
    if (!profileId) return;
    await queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(profileId, 'points') });
    await queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(profileId, 'dom_points') });
  };


  return {
    rewards,
    totalPoints,
    domPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    isLoading,
    profileId,
    saveReward,
    deleteReward,
    refetchRewards,
    refreshPoints,
  };
};

// Helper to create query keys for profile-specific points
const getProfilePointsQueryKey = (profileId: string | undefined, type: 'points' | 'dom_points') => {
  return ['profile_points', profileId || 'guest', type];
};

// Need to re-define fetchUserPoints and fetchUserDomPoints to accept profileId
// or ensure the existing ones in ./queries can be used without modification if they fetch for the current auth user.
// For useRewardsData, it's better if these fetches can target a specific profileId.

async function fetchUserPoints(profileId?: string): Promise<number> {
  if (!profileId) return 0;
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', profileId)
    .single();
  if (error) {
    console.error("Error fetching user points:", error);
    return 0; // Or throw error
  }
  return data?.points || 0;
}

async function fetchUserDomPoints(profileId?: string): Promise<number> {
  if (!profileId) return 0;
  const { data, error } = await supabase
    .from('profiles')
    .select('dom_points')
    .eq('id', profileId)
    .single();
  if (error) {
    console.error("Error fetching user dom points:", error);
    return 0; // Or throw error
  }
  return data?.dom_points || 0;
}
