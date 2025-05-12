import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/lib/rewardUtils';
import { supabase } from '@/integrations/supabase/client';
import { usePointsManagement } from './usePointsManagement';
import { fetchRewards, saveReward, deleteReward as deleteRewardUtil } from '@/lib/rewardUtils';
import { useBuySubReward } from "@/data/mutations/useBuySubReward";
import { useBuyDomReward } from "@/data/mutations/useBuyDomReward";
import { useRedeemSubReward } from "@/data/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "@/data/mutations/useRedeemDomReward";

export default function useRewardOperations() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalRewardsSupply, setTotalRewardsSupply] = useState(0);
  const [totalDomRewardsSupply, setTotalDomRewardsSupply] = useState(0);
  const queryClient = useQueryClient();

  const { 
    totalPoints, 
    domPoints, 
    setTotalPoints, 
    setDomPoints, 
    updatePointsInDatabase, 
    updateDomPointsInDatabase, 
    refreshPointsFromDatabase 
  } = usePointsManagement();
  
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
      const totalSupply = fetchedRewards.reduce((sum, reward) => sum + reward.supply, 0);
      setTotalRewardsSupply(totalSupply);
      
      // Calculate dom rewards supply
      const domSupply = fetchedRewards
        .filter(reward => reward.is_dom_reward)
        .reduce((sum, reward) => sum + reward.supply, 0);
      setTotalDomRewardsSupply(domSupply);
    }
  }, [fetchedRewards]);

  const handleSaveReward = useCallback(async (rewardData: any, index: number | null) => {
    try {
      // If we have an index, we're updating an existing reward
      const existingId = index !== null && rewards[index] ? rewards[index].id : undefined;
      
      // Save the reward to the database
      const savedReward = await saveReward(rewardData, existingId);
      
      if (savedReward) {
        // Update the local state
        const updatedRewards = [...rewards];
        
        if (index !== null && index >= 0 && index < rewards.length) {
          // Update existing reward
          updatedRewards[index] = savedReward;
        } else {
          // Add new reward
          updatedRewards.unshift(savedReward);
        }
        
        setRewards(updatedRewards);
        
        // Recalculate supplies
        const totalSupply = updatedRewards.reduce((sum, reward) => sum + reward.supply, 0);
        setTotalRewardsSupply(totalSupply);
        
        const domSupply = updatedRewards
          .filter(reward => reward.is_dom_reward)
          .reduce((sum, reward) => sum + reward.supply, 0);
        setTotalDomRewardsSupply(domSupply);
        
        // Update the query cache
        queryClient.setQueryData(REWARDS_QUERY_KEY, updatedRewards);
        
        return savedReward.id;
      }
      return null;
    } catch (error) {
      console.error('Error saving reward:', error);
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
      const success = await deleteRewardUtil(rewardId);
      
      if (success) {
        // Update local state
        const updatedRewards = rewards.filter((_, i) => i !== index);
        setRewards(updatedRewards);
        
        // Recalculate supplies
        const totalSupply = updatedRewards.reduce((sum, reward) => sum + reward.supply, 0);
        setTotalRewardsSupply(totalSupply);
        
        const domSupply = updatedRewards
          .filter(reward => reward.is_dom_reward)
          .reduce((sum, reward) => sum + reward.supply, 0);
        setTotalDomRewardsSupply(domSupply);
        
        // Update the query cache
        queryClient.setQueryData(REWARDS_QUERY_KEY, updatedRewards);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reward. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [rewards, queryClient]);

  const handleBuyReward = useCallback(async (id: string, cost: number, isDomReward = false) => {
    try {
      // Find the reward in our local state
      const rewardIndex = rewards.findIndex(r => r.id === id);
      if (rewardIndex === -1) {
        throw new Error('Reward not found');
      }
      
      const reward = rewards[rewardIndex];
      
      // Check if we have enough points
      if (isDomReward) {
        if (domPoints < cost) {
          toast({
            title: 'Not enough dom points',
            description: `You need ${cost} dom points to buy this reward.`,
            variant: 'destructive',
          });
          return;
        }
      } else {
        if (totalPoints < cost) {
          toast({
            title: 'Not enough points',
            description: `You need ${cost} points to buy this reward.`,
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Get the user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({
          title: 'Error',
          description: 'You must be logged in to buy rewards.',
          variant: 'destructive',
        });
        return;
      }
      
      // Buy the reward
      if (isDomReward) {
        await buyDom({
          rewardId: id,
          cost,
          currentSupply: reward.supply,
          profileId: userData.user.id,
          currentDomPoints: domPoints
        });
        
        // Update local state
        setDomPoints(domPoints - cost);
      } else {
        await buySub({
          rewardId: id,
          cost,
          currentSupply: reward.supply,
          profileId: userData.user.id,
          currentPoints: totalPoints
        });
        
        // Update local state
        setTotalPoints(totalPoints - cost);
      }
      
      // Update the reward supply in local state
      const updatedRewards = [...rewards];
      updatedRewards[rewardIndex] = {
        ...reward,
        supply: reward.supply - 1
      };
      setRewards(updatedRewards);
      
      // Recalculate supplies
      const totalSupply = updatedRewards.reduce((sum, reward) => sum + reward.supply, 0);
      setTotalRewardsSupply(totalSupply);
      
      const domSupply = updatedRewards
        .filter(reward => reward.is_dom_reward)
        .reduce((sum, reward) => sum + reward.supply, 0);
      setTotalDomRewardsSupply(domSupply);
      
      // Update the query cache
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      
      toast({
        title: 'Reward purchased!',
        description: `You bought ${reward.title} for ${cost} ${isDomReward ? 'dom ' : ''}points.`,
      });
    } catch (error) {
      console.error('Error buying reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to buy reward. Please try again.',
        variant: 'destructive',
      });
    }
  }, [rewards, totalPoints, domPoints, setTotalPoints, setDomPoints, buyDom, buySub, queryClient]);

  const handleUseReward = useCallback(async (id: string) => {
    try {
      // Find the reward in our local state
      const rewardIndex = rewards.findIndex(r => r.id === id);
      if (rewardIndex === -1) {
        throw new Error('Reward not found');
      }
      
      const reward = rewards[rewardIndex];
      
      // Get the user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        toast({
          title: 'Error',
          description: 'You must be logged in to use rewards.',
          variant: 'destructive',
        });
        return;
      }
      
      // Use the reward
      if (reward.is_dom_reward) {
        await redeemDom({
          rewardId: id,
          profileId: userData.user.id,
          currentSupply: reward.supply
        });
      } else {
        await redeemSub({
          rewardId: id,
          profileId: userData.user.id,
          currentSupply: reward.supply
        });
      }
      
      // Update the reward in local state if needed
      const updatedRewards = [...rewards];
      // If we need to update any properties after using the reward
      // updatedRewards[rewardIndex] = { ...updatedRewards[rewardIndex], someProperty: newValue };
      setRewards(updatedRewards);
      
      toast({
        title: 'Reward used!',
        description: `You used ${reward.title}.`,
      });
    } catch (error) {
      console.error('Error using reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to use reward. Please try again.',
        variant: 'destructive',
      });
    }
  }, [rewards, redeemDom, redeemSub]);

  return {
    rewards,
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints,
    setTotalPoints,
    setDomPoints,
    isLoading,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    refreshPointsFromDatabase
  };
}
