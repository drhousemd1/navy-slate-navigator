import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { Reward, CreateRewardVariables } from '@/data/rewards/types';
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  REWARDS_SUPPLY_QUERY_KEY,
  fetchRewards, 
  fetchTotalRewardsSupply
} from './queries'; 

// Import types from the central types file
import { useCreateRewardMutation, useUpdateRewardMutation } from '@/data/rewards/mutations/useSaveReward';
import { useDeleteReward as useDeleteRewardMutation } from '@/data/rewards/mutations/useDeleteReward'; // Corrected import and aliased
import { useBuySubReward } from '@/data/rewards/mutations/useBuySubReward';
import { useBuyDomReward } from '@/data/rewards/mutations/useBuyDomReward';
import { useRedeemSubReward } from '@/data/rewards/mutations/useRedeemSubReward';
import { useRedeemDomReward } from '@/data/rewards/mutations/useRedeemDomReward';

import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { usePointsManager } from '@/data/points/usePointsManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger'; // Added logger import


export const useRewardsData = () => {
  const queryClient = useQueryClient();
  // Use the new usePointsManager hook
  const { 
    points: totalPointsFromManager,      // Alias to avoid conflict if this file fetches points separately
    domPoints: domPointsFromManager,        // Alias
    setTotalPoints: updatePointsInDatabase, // Alias for consistency with its previous usage
    setDomPoints: updateDomPointsInDatabase,   // Alias
    refreshPoints: refreshPointsFromDatabase // Alias
  } = usePointsManager();

  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    error: rewardsError,
    refetch: refetchRewardsQuery
  } = useQuery<Reward[]>({ 
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards, 
    ...STANDARD_QUERY_CONFIG
  });

  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery<number>({ 
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply, 
    ...STANDARD_QUERY_CONFIG
  });
  
  const totalDomRewardsSupply = React.useMemo(() => {
    return rewards.reduce((total, reward) => { 
      return total + (reward.is_dom_reward && reward.supply !== -1 ? reward.supply : 0); // Handle infinite supply
    }, 0);
  }, [rewards]);

  useEffect(() => {
    const rewardsChannel = supabase
      .channel('rewards-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rewards' }, 
        (payload) => {
          logger.debug('Real-time rewards update:', payload); // Replaced console.log
          queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rewardsChannel);
    };
  }, [queryClient]);

  useEffect(() => {
    const sessionData = supabase.auth.getSession();
    sessionData.then(({ data }) => {
      const userId = data?.session?.user.id;
      if (!userId) return;
      const pointsChannel = supabase
        .channel(`profiles-changes-${userId}`) // Unique channel name per user
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
          (payload) => {
            logger.debug('Real-time points/profile update for user:', userId, payload); // Replaced console.log
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY});
            queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY});
            queryClient.invalidateQueries({ queryKey: ['profile'] }); // Added to ensure profile data (like points) is re-fetched
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(pointsChannel);
      };
    });
  }, [queryClient]);

  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMut = useDeleteRewardMutation(); // Usage remains the same due to alias

  const saveReward = async (saveParams: { rewardData: Partial<Reward> & { id?: string } } ) => {
    const { rewardData } = saveParams;
    if (rewardData.id) { 
      const { id, ...updateData } = rewardData;
      const updateVariables = { id, ...updateData }; // Ensure this matches UpdateRewardVariables
      return updateRewardMutation.mutateAsync(updateVariables);
    } else { 
      // Ensure all required fields for CreateRewardVariables are present
      if (rewardData.title === undefined || rewardData.cost === undefined || rewardData.supply === undefined || rewardData.is_dom_reward === undefined) {
        toast({ title: "Missing required fields for creation", description: "Title, cost, supply, and DOM status are required.", variant: "destructive" });
        throw new Error("Missing required fields for creation");
      }

      const createVariables: CreateRewardVariables = {
        title: rewardData.title,
        cost: rewardData.cost,
        supply: rewardData.supply,
        is_dom_reward: rewardData.is_dom_reward,
        description: rewardData.description || null, // Ensure this matches the type, changed from ''
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
      return createRewardMutation.mutateAsync(createVariables);
    }
  };

  const deleteReward = async (rewardId: string) => {
    return deleteRewardMut.mutateAsync(rewardId); // Usage remains the same
  };

  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();

  const buyReward = async ({ rewardId, cost }: { rewardId: string; cost: number }) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) throw new Error("Reward not found for buying");
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) throw new Error("User not authenticated for buying reward");
    const profileId = userData.user.id;
        
    if (reward.is_dom_reward) {
      // Ensure currentDomPoints is fetched or available
      const currentDomPoints = queryClient.getQueryData<number>(REWARDS_DOM_POINTS_QUERY_KEY) ?? domPointsFromManager; // Use nullish coalescing
      return buyDom({ rewardId, cost, currentSupply: reward.supply, profileId, currentDomPoints });
    } else {
      // Ensure currentPoints is fetched or available
      const currentPoints = queryClient.getQueryData<number>(REWARDS_POINTS_QUERY_KEY) ?? totalPointsFromManager; // Use nullish coalescing
      return buySub({ rewardId, cost, currentSupply: reward.supply, profileId, currentPoints });
    }
  };

  const useReward = async ({ rewardId }: { rewardId: string }) => { 
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) throw new Error("Reward not found for using");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) throw new Error("User not authenticated for using reward");
    const profileId = userData.user.id;

    if (reward.is_dom_reward) {
      return redeemDom({ rewardId, currentSupply: reward.supply, profileId });
    } else {
      return redeemSub({ rewardId, currentSupply: reward.supply, profileId });
    }
  };
  
  const refetchRewardsTyped = (options?: RefetchOptions) => {
    return refetchRewardsQuery(options) as Promise<QueryObserverResult<Reward[], Error>>;
  };

  return {
    rewards,
    totalPoints: totalPointsFromManager, // Use points from usePointsManager
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints: domPointsFromManager, // Use domPoints from usePointsManager
    isLoading: rewardsLoading, // This isLoading is specific to rewards query
    error: rewardsError,
    saveReward,
    deleteReward,
    buyReward,
    useReward, 
    updatePoints: updatePointsInDatabase, // Exporting the function from usePointsManager
    updateDomPoints: updateDomPointsInDatabase, // Exporting the function from usePointsManager
    refetchRewards: refetchRewardsTyped,
    refreshPointsFromDatabase, // Exporting the function from usePointsManager
  };
};
