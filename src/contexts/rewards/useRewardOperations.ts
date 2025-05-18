import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { supabase } from '@/integrations/supabase/client';
import { usePointsManager } from '@/data/points/usePointsManager';
import { fetchRewards, saveReward, deleteReward as deleteRewardUtil } from '@/lib/rewardUtils';
import { useBuySubReward } from "@/data/rewards/mutations/useBuySubReward";
import { useBuyDomReward } from "@/data/rewards/mutations/useBuyDomReward";
import { useRedeemSubReward } from "@/data/rewards/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "@/data/rewards/mutations/useRedeemDomReward";

export default function useRewardOperations() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalRewardsSupply, setTotalRewardsSupply] = useState(0);
  const [totalDomRewardsSupply, setTotalDomRewardsSupply] = useState(0);
  const queryClient = useQueryClient();

  // Use the new usePointsManager hook
  const { 
    points: totalPoints,             // Alias 'points' to 'totalPoints'
    domPoints,
    setTotalPoints: updatePointsInDatabase, // Alias 'setTotalPoints' to 'updatePointsInDatabase'
    setDomPoints: updateDomPointsInDatabase,   // Alias 'setDomPoints' to 'updateDomPointsInDatabase'
    refreshPoints: refreshPointsFromDatabase // Alias 'refreshPoints' to 'refreshPointsFromDatabase'
  } = usePointsManager();
  
  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();
  
  const { 
    data: fetchedRewards = [], 
    isLoading,
    refetch: refetchRewards
  } = useQuery<Reward[]>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (fetchedRewards && fetchedRewards.length > 0) {
      setRewards(fetchedRewards);
      
      // Calculate total supply
      const totalSupply = fetchedRewards.reduce((sum, reward) => sum + (reward.supply === -1 ? 0 : reward.supply), 0); // Handle infinite supply
      setTotalRewardsSupply(totalSupply);
      
      // Calculate dom rewards supply
      const domSupply = fetchedRewards
        .filter(reward => reward.is_dom_reward)
        .reduce((sum, reward) => sum + (reward.supply === -1 ? 0 : reward.supply), 0); // Handle infinite supply
      setTotalDomRewardsSupply(domSupply);
    } else if (fetchedRewards) { // if fetchedRewards is an empty array
        setRewards([]);
        setTotalRewardsSupply(0);
        setTotalDomRewardsSupply(0);
    }
  }, [fetchedRewards]);

  const handleSaveReward = useCallback(async (rewardData: any, index: number | null) => {
    try {
      const existingId = index !== null && rewards[index] ? rewards[index].id : undefined;
      const savedRewardData = await saveReward(rewardData, existingId); // saveReward from lib/rewardUtils
      
      if (savedRewardData) {
        const optimisticId = savedRewardData.id;
        // This part might be redundant if react-query handles optimistic updates well with invalidateQueries
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldData = []) => {
            if (existingId) { // Update
                return oldData.map(r => r.id === existingId ? savedRewardData : r);
            } else { // Create
                return [{ ...savedRewardData, id: optimisticId }, ...oldData];
            }
        });
        await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
        return savedRewardData.id;
      }
      return null;
    } catch (error) {
      console.error('Error saving reward in useRewardOperations:', error);
      toast({
        title: 'Error',
        description: 'Failed to save reward. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  }, [rewards, queryClient]);

  const handleDeleteReward = useCallback(async (index: number) => {
    if (index < 0 || index >= rewards.length) {
      console.error('Invalid reward index:', index);
      return false;
    }
    
    const rewardId = rewards[index].id;
    
    try {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldData = []) => 
        oldData.filter(r => r.id !== rewardId)
      );
      const success = await deleteRewardUtil(rewardId); // deleteRewardUtil from lib/rewardUtils
      
      if (success) {
        await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
        return true;
      } else {
         // Revert optimistic update
        queryClient.setQueryData(REWARDS_QUERY_KEY, rewards);
        return false;
      }
    } catch (error) {
      // Revert optimistic update
      queryClient.setQueryData(REWARDS_QUERY_KEY, rewards);
      console.error('Error deleting reward in useRewardOperations:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reward. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [rewards, queryClient]);

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
        // Points update is handled by the buyDom mutation's onSuccess/onMutate
      } else {
        if (totalPoints < cost) throw new Error("Not enough points.");
        await buySub({
          rewardId: id,
          cost,
          currentSupply: rewardToBuy.supply,
          profileId: profileId,
          currentPoints: totalPoints
        });
         // Points update is handled by the buySub mutation's onSuccess/onMutate
      }
      // Invalidation should happen in the individual mutation hooks
      // await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      // await queryClient.invalidateQueries({ queryKey: isDom ? REWARDS_DOM_POINTS_QUERY_KEY : REWARDS_POINTS_QUERY_KEY });

      // Toast is handled by individual mutation hooks
    } catch (error: any) {
      console.error('Error buying reward in useRewardOperations:', error);
      toast({
        title: 'Purchase Error',
        description: error.message || 'Failed to buy reward.',
        variant: 'destructive',
      });
    }
  }, [queryClient, totalPoints, domPoints, buyDom, buySub]); // Removed rewards dependency, use queryClient.getQueryData

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
      // Invalidation and toast handled by individual mutation hooks
      // await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    } catch (error: any) {
      console.error('Error using reward in useRewardOperations:', error);
      toast({
        title: 'Usage Error',
        description: error.message || 'Failed to use reward.',
        variant: 'destructive',
      });
    }
  }, [queryClient, redeemDom, redeemSub]); // Removed rewards dependency

  return {
    rewards: fetchedRewards, // Use fetchedRewards which is from useQuery
    totalPoints, // Now from usePointsManager
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints, // Now from usePointsManager
    setTotalPoints: updatePointsInDatabase, // Mapped to the function from usePointsManager
    setDomPoints: updateDomPointsInDatabase, // Mapped to the function from usePointsManager
    isLoading,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    refreshPointsFromDatabase // Now from usePointsManager
  };
}
