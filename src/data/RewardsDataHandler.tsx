import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward, UpdateRewardVariables } from './rewards/types';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

// Import specific mutation hooks directly
import { useCreateRewardMutation, useUpdateRewardMutation, CreateRewardVariables } from './rewards/mutations/useSaveReward';
import { useDeleteReward as useDeleteRewardMutation } from './rewards/mutations/useDeleteReward';

import { fetchRewards, fetchUserPoints, fetchUserDomPoints, fetchTotalRewardsSupply } from './rewards/queries';
import { REWARDS_QUERY_KEY, REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY, REWARDS_SUPPLY_QUERY_KEY } from './rewards/queries';
import { toast } from '@/hooks/use-toast';
import { saveRewardsToDB, savePointsToDB, saveDomPointsToDB } from './indexedDB/useIndexedDB';

export interface SaveRewardParams {
  rewardData: Partial<Reward>;
  currentIndex: number | null;
}

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  
  // Query hooks
  const { 
    data: rewards = [], 
    isLoading: isRewardsLoading,
    refetch: refetchRewards
  } = useQuery<Reward[]>({
    queryKey: [...REWARDS_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchRewards(subUserId, domUserId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!(subUserId || domUserId),
  });

  const { 
    data: totalPoints = 0,
    isLoading: isPointsLoading 
  } = useQuery<number>({
    queryKey: REWARDS_POINTS_QUERY_KEY,
    queryFn: fetchUserPoints,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { 
    data: domPoints = 0,
    isLoading: isDomPointsLoading 
  } = useQuery<number>({
    queryKey: REWARDS_DOM_POINTS_QUERY_KEY,
    queryFn: fetchUserDomPoints,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { 
    data: totalRewardsSupply = 0,
    isLoading: isSupplyLoading 
  } = useQuery<number>({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation hooks
  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMutation = useDeleteRewardMutation();

  // Calculate total dom rewards supply
  const totalDomRewardsSupply = Array.isArray(rewards) ? rewards
    .filter(reward => reward.is_dom_reward)
    .reduce((total, reward) => total + reward.supply, 0) : 0;

  // Derived loading state
  const isLoading = isRewardsLoading || isPointsLoading || isDomPointsLoading || isSupplyLoading;

  // Save reward function (handles both create and update)
  const saveReward = async ({ rewardData, currentIndex }: SaveRewardParams): Promise<Reward | null> => {
    try {
      if (currentIndex !== null && rewardData.id) {
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
        
        const createVariables = {
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
      logger.error("Error in saveReward:", error);
      return null;
    }
  };

  // Delete reward function
  const deleteReward = async (rewardId: string): Promise<boolean> => {
    try {
      await deleteRewardMutation.mutateAsync(rewardId);
      return true;
    } catch (error) {
      logger.error("Error in deleteReward:", error);
      return false;
    }
  };

  // Buy reward function
  const buyReward = async ({ rewardId, cost }: { rewardId: string; cost: number }): Promise<boolean> => {
    try {
      const reward = Array.isArray(rewards) ? rewards.find(r => r.id === rewardId) : undefined;
      if (!reward) {
        toast({ title: "Error", description: "Reward not found", variant: "destructive" });
        return false;
      }
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
        return false;
      }
      
      const isDomReward = reward.is_dom_reward;
      const currentPoints = isDomReward ? domPoints : totalPoints;
      
      if (currentPoints < cost) {
        toast({
          title: "Not Enough Points",
          description: `You need ${cost} ${isDomReward ? "dom " : ""}points to buy this reward.`,
          variant: "destructive",
        });
        return false;
      }
      
      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: reward.supply + 1 }) 
        .eq('id', rewardId);
        
      if (supplyError) {
        toast({ title: "Error", description: "Failed to update reward supply", variant: "destructive" });
        return false;
      }
      
      const newPoints = currentPoints - cost;
      const pointsField = isDomReward ? 'dom_points' : 'points';
      
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ [pointsField]: newPoints })
        .eq('id', userData.user.id);
        
      if (pointsError) {
        await supabase.from('rewards').update({ supply: reward.supply }).eq('id', rewardId);
        toast({ title: "Error", description: "Failed to update points", variant: "destructive" });
        return false;
      }
      
      if (isDomReward) {
        queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, newPoints);
        await saveDomPointsToDB(newPoints);
      } else {
        queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, newPoints);
        await savePointsToDB(newPoints);
      }
      
      queryClient.setQueryData<Reward[]>([...REWARDS_QUERY_KEY, subUserId, domUserId], (oldRewards = []) => {
        const updatedRewards = oldRewards.map(r => 
          r.id === rewardId ? { ...r, supply: r.supply + 1 } : r 
        );
        saveRewardsToDB(updatedRewards);
        return updatedRewards;
      });
      
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: isDomReward ? REWARDS_DOM_POINTS_QUERY_KEY : REWARDS_POINTS_QUERY_KEY });
      
      return true;
    } catch (error) {
      logger.error("Error in buyReward:", error);
      return false;
    }
  };

  // Use reward function
  const useReward = async ({ rewardId }: { rewardId: string }): Promise<boolean> => {
    try {
      const reward = Array.isArray(rewards) ? rewards.find(r => r.id === rewardId) : undefined;
      if (!reward) {
        toast({ title: "Error", description: "Reward not found", variant: "destructive" });
        return false;
      }
      
      if (reward.supply <= 0 && reward.supply !== -1) { 
        toast({
          title: "Cannot Use Reward",
          description: "You don't have any of this reward to use or it's out of stock.",
          variant: "destructive",
        });
        return false;
      }
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
        return false;
      }
      
      const newSupply = reward.supply === -1 ? -1 : Math.max(0, reward.supply - 1);
      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply })
        .eq('id', rewardId);
        
      if (supplyError) {
        toast({ title: "Error", description: "Failed to update reward supply", variant: "destructive" });
        return false;
      }
      
      queryClient.setQueryData<Reward[]>([...REWARDS_QUERY_KEY, subUserId, domUserId], (oldRewards = []) => {
        const updatedRewards = oldRewards.map(r => 
          r.id === rewardId ? { ...r, supply: newSupply } : r
        );
        saveRewardsToDB(updatedRewards);
        return updatedRewards;
      });
      
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      return true;
    } catch (error) {
      logger.error("Error in useReward:", error);
      return false;
    }
  };

  // Update points function
  const updatePoints = async (newPoints: number): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
        return false;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userData.user.id);
        
      if (error) {
        toast({ title: "Error", description: "Failed to update points", variant: "destructive" });
        return false;
      }
      
      queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, newPoints);
      await savePointsToDB(newPoints);
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      return true;
    } catch (error) {
      logger.error("Error in updatePoints:", error);
      return false;
    }
  };

  // Update dom points function
  const updateDomPoints = async (newPoints: number): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
        return false;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ dom_points: newPoints })
        .eq('id', userData.user.id);
        
      if (error) {
        toast({ title: "Error", description: "Failed to update dom points", variant: "destructive" });
        return false;
      }
      
      queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, newPoints);
      await saveDomPointsToDB(newPoints);
      queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      return true;
    } catch (error) {
      logger.error("Error in updateDomPoints:", error);
      return false;
    }
  };

  // Refresh points from database
  const refreshPointsFromDatabase = async (): Promise<void> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('points, dom_points')
        .eq('id', userData.user.id)
        .single();
        
      if (error || !data) {
          if(error) logger.error("Error fetching profile for points refresh:", error);
          return;
      }
      
      queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, data.points || 0);
      queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, data.dom_points || 0);
      
      await savePointsToDB(data.points || 0);
      await saveDomPointsToDB(data.dom_points || 0);
    } catch (error) {
      logger.error("Error in refreshPointsFromDatabase:", error);
    }
  };

  // Optimistic update helpers
  const setRewardsOptimistically = (updatedRewards: Reward[]) => {
    queryClient.setQueryData(REWARDS_QUERY_KEY, updatedRewards);
    saveRewardsToDB(updatedRewards);
  };

  const setPointsOptimistically = (points: number) => {
    queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, points);
    savePointsToDB(points);
  };

  const setDomPointsOptimistically = (points: number) => {
    queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, points);
    saveDomPointsToDB(points);
  };

  return {
    rewards: Array.isArray(rewards) ? rewards : [],
    totalPoints,
    domPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    isLoading,
    saveReward,
    deleteReward,
    buyReward,
    useReward,
    // updatePoints,
    // updateDomPoints,
    refetchRewards,
    // refreshPointsFromDatabase,
    // setRewardsOptimistically,
    // setPointsOptimistically,
    // setDomPointsOptimistically
  };
};
