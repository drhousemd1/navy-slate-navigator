import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { REWARDS_QUERY_KEY, fetchRewards } from '@/data/rewards/queries';
import { toast } from '@/hooks/use-toast';
import { Reward, CreateRewardVariables, UpdateRewardVariables } from '@/data/rewards/types';
import { supabase } from '@/integrations/supabase/client';
import { usePointsManager } from '@/data/points/usePointsManager';
import { useCreateRewardMutation, useUpdateRewardMutation } from "@/data/rewards/mutations/useSaveReward";
import { useDeleteRewardMutation } from "@/data/rewards/mutations/useDeleteReward";
import { useBuySubReward } from "@/data/rewards/mutations/useBuySubReward";
import { useBuyDomReward } from "@/data/rewards/mutations/useBuyDomReward";
import { useRedeemSubReward } from "@/data/rewards/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "@/data/rewards/mutations/useRedeemDomReward";

export default function useRewardOperations() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalRewardsSupply, setTotalRewardsSupply] = useState(0);
  const [totalDomRewardsSupply, setTotalDomRewardsSupply] = useState(0);
  const queryClient = useQueryClient();

  const { 
    points: totalPoints,
    domPoints,
    setTotalPoints: updatePointsInDatabase,
    setDomPoints: updateDomPointsInDatabase,
    refreshPoints: refreshPointsFromDatabase
  } = usePointsManager();
  
  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();

  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMutation = useDeleteRewardMutation();
  
  const { 
    data: fetchedRewards = [], 
    isLoading,
    refetch: refetchRewards
  } = useQuery<Reward[]>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 5, 
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (fetchedRewards && fetchedRewards.length > 0) {
      setRewards(fetchedRewards);
      
      const totalSupply = fetchedRewards.reduce((sum, reward) => sum + (reward.supply === -1 ? 0 : reward.supply), 0);
      setTotalRewardsSupply(totalSupply);
      
      const domSupply = fetchedRewards
        .filter(reward => reward.is_dom_reward)
        .reduce((sum, reward) => sum + (reward.supply === -1 ? 0 : reward.supply), 0);
      setTotalDomRewardsSupply(domSupply);
    } else if (fetchedRewards) { 
        setRewards([]);
        setTotalRewardsSupply(0);
        setTotalDomRewardsSupply(0);
    }
  }, [fetchedRewards]);

  const handleSaveReward = useCallback(async (rewardData: Partial<Reward> & { id?: string }, index: number | null): Promise<string | null> => {
    try {
      const existingId = index !== null && rewards[index] ? rewards[index].id : (rewardData.id || undefined);
      let savedRewardData: Reward | null = null;

      if (existingId) { // Update
        const updatePayload: UpdateRewardVariables = { 
          id: existingId, 
          ...rewardData,
        };
        delete (updatePayload as any).created_at;
        delete (updatePayload as any).updated_at;
        
        savedRewardData = await updateRewardMutation.mutateAsync(updatePayload);
      } else { // Create
        if (rewardData.title === undefined || rewardData.cost === undefined || rewardData.supply === undefined || rewardData.is_dom_reward === undefined) {
          toast({ title: "Missing required fields", description: "Title, cost, supply, and DOM status are required for new rewards.", variant: "destructive" });
          throw new Error("Missing required fields for creation");
        }
        const createPayload: CreateRewardVariables = {
          title: rewardData.title,
          cost: rewardData.cost,
          supply: rewardData.supply,
          is_dom_reward: rewardData.is_dom_reward,
          description: rewardData.description || '',
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
        savedRewardData = await createRewardMutation.mutateAsync(createPayload);
      }
      
      if (savedRewardData) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldData = []) => {
            if (existingId) { 
                return oldData.map(r => r.id === existingId ? savedRewardData! : r);
            } else { 
                return [savedRewardData!, ...oldData];
            }
        });
        await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }); 
        return savedRewardData.id;
      }
      return null;
    } catch (error) {
      console.error('Error saving reward in useRewardOperations:', error);
      return null;
    }
  }, [rewards, queryClient, createRewardMutation, updateRewardMutation]);

  const handleDeleteReward = useCallback(async (index: number): Promise<boolean> => {
    if (index < 0 || index >= rewards.length) {
      console.error('Invalid reward index:', index);
      return false;
    }
    
    const rewardId = rewards[index].id;
    const originalRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
    
    try {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldData = []) => 
        oldData.filter(r => r.id !== rewardId)
      );
      
      await deleteRewardMutation.mutateAsync(rewardId);
      return true;
    } catch (error) {
      queryClient.setQueryData(REWARDS_QUERY_KEY, originalRewards); 
      console.error('Error deleting reward in useRewardOperations:', error);
      return false;
    }
  }, [rewards, queryClient, deleteRewardMutation]);

  const handleBuyReward = useCallback(async (id: string, cost: number, isDomRewardParam = false) => {
    const rewardToBuy = (queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || []).find(r => r.id === id);
    if (!rewardToBuy) {
        toast({ title: 'Error', description: 'Reward not found.', variant: 'destructive' });
        return;
    }
    const isDom = isDomRewardParam || rewardToBuy.is_dom_reward;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
      }
      const profileId = userData.user.id;
      
      if (isDom) {
        if (domPoints < cost) throw new Error("Not enough dom points.");
        await buyDom({
          rewardId: id,
          cost,
          currentSupply: rewardToBuy.supply,
          profileId: profileId,
          currentDomPoints: domPoints
        });
      } else {
        if (totalPoints < cost) throw new Error("Not enough points.");
        await buySub({
          rewardId: id,
          cost,
          currentSupply: rewardToBuy.supply,
          profileId: profileId,
          currentPoints: totalPoints
        });
      }
    } catch (error: any) {
      console.error('Error buying reward in useRewardOperations:', error);
      toast({
        title: 'Purchase Error',
        description: error.message || 'Failed to buy reward.',
        variant: 'destructive',
      });
    }
  }, [queryClient, totalPoints, domPoints, buyDom, buySub]);

  const handleUseReward = useCallback(async (id: string) => {
    const rewardToUse = (queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || []).find(r => r.id === id);
     if (!rewardToUse) {
        toast({ title: 'Error', description: 'Reward not found.', variant: 'destructive' });
        return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
      }
      const profileId = userData.user.id;

      if (rewardToUse.is_dom_reward) {
        await redeemDom({
          rewardId: id,
          profileId: profileId,
          currentSupply: rewardToUse.supply
        });
      } else {
        await redeemSub({
          rewardId: id,
          profileId: profileId,
          currentSupply: rewardToUse.supply
        });
      }
    } catch (error: any) {
      console.error('Error using reward in useRewardOperations:', error);
      toast({
        title: 'Usage Error',
        description: error.message || 'Failed to use reward.',
        variant: 'destructive',
      });
    }
  }, [queryClient, redeemDom, redeemSub]);

  return {
    rewards: fetchedRewards, 
    totalPoints, 
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints, 
    setTotalPoints: updatePointsInDatabase, 
    setDomPoints: updateDomPointsInDatabase, 
    isLoading,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    refreshPointsFromDatabase 
  };
}
