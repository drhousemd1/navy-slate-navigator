import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { Reward, CreateRewardVariables } from '@/data/rewards/types';
import { 
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  REWARDS_SUPPLY_QUERY_KEY,
  useRewardsQuery, 
  fetchTotalRewardsSupply,
  getRewardsQueryKey
} from './queries'; 

// Import types from the central types file
import { useCreateRewardMutation, useUpdateRewardMutation } from '@/data/rewards/mutations/useSaveReward';
import { useDeleteReward as useDeleteRewardMutation } from '@/data/rewards/mutations/useDeleteReward';
import { useBuySubReward } from '@/data/rewards/mutations/useBuySubReward';
import { useBuyDomReward } from '@/data/rewards/mutations/useBuyDomReward';
import { useRedeemSubReward } from '@/data/rewards/mutations/useRedeemSubReward';
import { useRedeemDomReward } from '@/data/rewards/mutations/useRedeemDomReward';

import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { usePointsManager } from '@/data/points/usePointsManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { saveRewardsToDB } from '../indexedDB/useIndexedDB';
import { useUserIds } from '@/contexts/UserIdsContext';

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  
  // Use the standardized query key function - this is the key fix!
  const rewardsQueryKey = getRewardsQueryKey(subUserId, domUserId);
  
  // Use the new usePointsManager hook
  const { 
    points: totalPointsFromManager,
    domPoints: domPointsFromManager,
    setTotalPoints: updatePointsInDatabase,
    setDomPoints: updateDomPointsInDatabase,
    refreshPoints: refreshPointsFromDatabase
  } = usePointsManager();

  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    error: rewardsError,
    refetch: refetchRewardsQuery
  } = useRewardsQuery();

  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery<number>({ 
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply, 
    ...STANDARD_QUERY_CONFIG
  });
  
  const totalDomRewardsSupply = React.useMemo(() => {
    return Array.isArray(rewards) ? rewards.reduce((total, reward) => { 
      return total + (reward.is_dom_reward && reward.supply !== -1 ? reward.supply : 0);
    }, 0) : 0;
  }, [rewards]);

  // Real-time subscriptions with proper cleanup
  useEffect(() => {
    const rewardsChannel = supabase
      .channel('rewards-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rewards' }, 
        (payload) => {
          logger.debug('Real-time rewards update:', payload);
          queryClient.invalidateQueries({ queryKey: rewardsQueryKey });
          queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rewardsChannel);
    };
  }, [queryClient, rewardsQueryKey]);

  useEffect(() => {
    const sessionData = supabase.auth.getSession();
    sessionData.then(({ data }) => {
      const userId = data?.session?.user.id;
      if (!userId) return;
      
      const pointsChannel = supabase
        .channel(`profiles-changes-${userId}`)
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
          (payload) => {
            logger.debug('Real-time points/profile update for user:', userId, payload);
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY});
            queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY});
            queryClient.invalidateQueries({ queryKey: ['profile'] });
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
  const deleteRewardMut = useDeleteRewardMutation();

  const saveReward = async (saveParams: { rewardData: Partial<Reward>; currentIndex: number | null }) => {
    const { rewardData } = saveParams;
    
    let result;
    if (rewardData.id) { 
      const { id, ...updateData } = rewardData;
      const updateVariables = { id, ...updateData };
      result = await updateRewardMutation.mutateAsync(updateVariables);
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
        description: rewardData.description || null,
        background_image_url: rewardData.background_image_url || null,
        background_opacity: rewardData.background_opacity ?? 100,
        icon_name: rewardData.icon_name || 'Award',
        icon_color: rewardData.icon_color || '#9b87f5',
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
        highlight_effect: rewardData.highlight_effect ?? false,
        focal_point_x: rewardData.focal_point_x ?? 50,
        focal_point_y: rewardData.focal_point_y ?? 50,
      };
      result = await createRewardMutation.mutateAsync(createVariables);
    }
    
    // Update IndexedDB cache after successful save - use the standardized query key
    const updatedRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey) || [];
    await saveRewardsToDB(updatedRewards);
    
    return result;
  };

  const deleteReward = async (rewardId: string) => {
    const result = await deleteRewardMut.mutateAsync(rewardId);
    
    // Update IndexedDB cache after successful delete - use the standardized query key
    const updatedRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey) || [];
    await saveRewardsToDB(updatedRewards);
    
    return result;
  };

  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();

  const buyReward = async ({ rewardId, cost, isDomReward }: { rewardId: string; cost: number; isDomReward: boolean }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) throw new Error("User not authenticated for buying reward");
    
    // Find the reward to get its current supply
    const reward = Array.isArray(rewards) ? rewards.find(r => r.id === rewardId) : undefined;
    if (!reward) throw new Error("Reward not found for buying");
        
    let result;
    if (isDomReward) {
      const currentDomPoints = domPointsFromManager;
      logger.debug("Buying DOM reward:", { rewardId, cost, currentDomPoints });
      result = await buyDom({ rewardId, cost, currentSupply: reward.supply, currentDomPoints });
    } else {
      const currentPoints = totalPointsFromManager;
      logger.debug("Buying Sub reward:", { rewardId, cost, currentPoints });
      result = await buySub({ rewardId, cost, currentSupply: reward.supply, currentPoints });
    }
    
    // Update IndexedDB cache after successful purchase - use the standardized query key
    const updatedRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey) || [];
    await saveRewardsToDB(updatedRewards);
    
    return result;
  };

  const useReward = async ({ rewardId }: { rewardId: string }) => { 
    const reward = Array.isArray(rewards) ? rewards.find(r => r.id === rewardId) : undefined;
    if (!reward) throw new Error("Reward not found for using");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) throw new Error("User not authenticated for using reward");
    const profileId = userData.user.id;

    let result;
    if (reward.is_dom_reward) {
      logger.debug("Using DOM reward:", { rewardId, profileId });
      result = await redeemDom({ rewardId, currentSupply: reward.supply, profileId });
    } else {
      logger.debug("Using Sub reward:", { rewardId, profileId });
      result = await redeemSub({ rewardId, currentSupply: reward.supply, profileId });
    }
    
    // Update IndexedDB cache after successful redemption - use the standardized query key
    const updatedRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey) || [];
    await saveRewardsToDB(updatedRewards);
    
    return result;
  };
  
  const refetchRewardsTyped = (options?: RefetchOptions) => {
    return refetchRewardsQuery(options) as Promise<QueryObserverResult<Reward[], Error>>;
  };

  return {
    rewards: Array.isArray(rewards) ? rewards : [],
    totalPoints: totalPointsFromManager,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints: domPointsFromManager,
    isLoading: rewardsLoading,
    error: rewardsError,
    saveReward,
    deleteReward,
    buyReward,
    useReward, 
    updatePoints: updatePointsInDatabase,
    updateDomPoints: updateDomPointsInDatabase,
    refetchRewards: refetchRewardsTyped,
    refreshPointsFromDatabase,
  };
};
