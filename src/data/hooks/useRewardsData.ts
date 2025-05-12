
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useState, useCallback, useEffect } from 'react';
import { Reward } from '@/lib/rewardUtils';
import { useRewardsQuery } from '../queries/useRewardsQuery';
import { useBuyReward } from '../mutations/useBuyReward';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  REWARDS_POINTS_QUERY_KEY, 
  REWARDS_DOM_POINTS_QUERY_KEY,
  fetchUserPoints,
  fetchUserDomPoints
} from '../rewards/queries';
import { toast } from '@/hooks/use-toast';

export function useRewardsData() {
  const { data: rewards = [], isLoading, error, refetch: refetchRewards } = useRewardsQuery();
  const buyRewardMutation = useBuyReward();
  
  // State for managing points
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [domPoints, setDomPoints] = useState<number>(0);
  const [totalRewardsSupply, setTotalRewardsSupply] = useState<number>(0);
  const [totalDomRewardsSupply, setTotalDomRewardsSupply] = useState<number>(0);
  
  const queryClient = useQueryClient();
  
  // Query for points
  const { data: pointsData } = useQuery({
    queryKey: REWARDS_POINTS_QUERY_KEY,
    queryFn: fetchUserPoints,
    staleTime: 300000, // 5 minutes
    enabled: true
  });
  
  // Query for dom points
  const { data: domPointsData } = useQuery({
    queryKey: REWARDS_DOM_POINTS_QUERY_KEY,
    queryFn: fetchUserDomPoints,
    staleTime: 300000, // 5 minutes
    enabled: true
  });
  
  // Update state when data changes
  useEffect(() => {
    if (pointsData !== undefined) {
      setTotalPoints(pointsData);
    }
  }, [pointsData]);
  
  useEffect(() => {
    if (domPointsData !== undefined) {
      setDomPoints(domPointsData);
    }
  }, [domPointsData]);
  
  // Calculate rewards supply
  useEffect(() => {
    if (Array.isArray(rewards)) {
      const regularRewards = rewards.filter(r => !r.is_dom_reward);
      const domRewards = rewards.filter(r => r.is_dom_reward);
      
      const regularSupply = regularRewards.reduce((sum, r) => sum + (r.supply || 0), 0);
      const domSupply = domRewards.reduce((sum, r) => sum + (r.supply || 0), 0);
      
      setTotalRewardsSupply(regularSupply);
      setTotalDomRewardsSupply(domSupply);
    }
  }, [rewards]);

  const refreshPointsFromDatabase = useCallback(async (): Promise<void> => {
    try {
      console.log("Refreshing points from database");
      await queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
    } catch (err) {
      console.error('Error refreshing points:', err);
    }
  }, [queryClient]);
  
  // Optimistic update setters
  const setPointsOptimistically = (points: number) => {
    setTotalPoints(points);
  };
  
  const setDomPointsOptimistically = (points: number) => {
    setDomPoints(points);
  };
  
  const saveReward = async (rewardData: Partial<Reward>, currentIndex?: number | null): Promise<Reward | null> => {
    try {
      if (rewardData.id) {
        // Update existing reward
        const { data, error } = await supabase
          .from('rewards')
          .update({
            title: rewardData.title,
            description: rewardData.description,
            cost: rewardData.cost,
            supply: rewardData.supply,
            is_dom_reward: rewardData.is_dom_reward,
            background_image_url: rewardData.background_image_url,
            background_opacity: rewardData.background_opacity,
            focal_point_x: rewardData.focal_point_x,
            focal_point_y: rewardData.focal_point_y,
            icon_name: rewardData.icon_name,
            icon_color: rewardData.icon_color,
            title_color: rewardData.title_color,
            subtext_color: rewardData.subtext_color,
            calendar_color: rewardData.calendar_color,
            highlight_effect: rewardData.highlight_effect
          })
          .eq('id', rewardData.id)
          .select()
          .single();
          
        if (error) throw error;
        await refetchRewards();
        return data as Reward;
      } else {
        // Create new reward
        const { data, error } = await supabase
          .from('rewards')
          .insert({
            title: rewardData.title || 'New Reward',
            description: rewardData.description || '',
            cost: rewardData.cost || 10,
            supply: rewardData.supply || 0,
            is_dom_reward: rewardData.is_dom_reward || false,
            background_image_url: rewardData.background_image_url || null,
            background_opacity: rewardData.background_opacity || 100,
            focal_point_x: rewardData.focal_point_x || 50,
            focal_point_y: rewardData.focal_point_y || 50,
            icon_name: rewardData.icon_name || 'gift',
            icon_color: rewardData.icon_color || '#9b87f5',
            title_color: rewardData.title_color || '#FFFFFF',
            subtext_color: rewardData.subtext_color || '#8E9196',
            calendar_color: rewardData.calendar_color || '#7E69AB',
            highlight_effect: rewardData.highlight_effect || false
          })
          .select()
          .single();
          
        if (error) throw error;
        await refetchRewards();
        return data as Reward;
      }
    } catch (err) {
      console.error('Error saving reward:', err);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };
  
  const deleteReward = async (rewardId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);
        
      if (error) throw error;
      await refetchRewards();
      return true;
    } catch (err) {
      console.error('Error deleting reward:', err);
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };
  
  const buyReward = async (reward: Reward): Promise<boolean> => {
    try {
      await buyRewardMutation.mutateAsync({ reward });
      await refreshPointsFromDatabase();
      return true;
    } catch (err) {
      console.error('Error in buyReward:', err);
      return false;
    }
  };

  const useReward = async (reward: Reward): Promise<boolean> => {
    try {
      if (reward.supply <= 0) {
        toast({
          title: "Cannot Use Reward",
          description: "You don't have any of this reward to use.",
          variant: "destructive",
        });
        return false;
      }
      
      // Update reward supply
      const { error: rewardError } = await supabase
        .from('rewards')
        .update({ supply: reward.supply - 1 })
        .eq('id', reward.id);
        
      if (rewardError) throw rewardError;
      
      // Record usage
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
      
      const { error: usageError } = await supabase
        .from('reward_usage')
        .insert({
          reward_id: reward.id,
          day_of_week: dayOfWeek,
          week_number: weekNumber,
          used: true,
          created_at: today.toISOString()
        });
        
      if (usageError) console.error("Error recording reward usage:", usageError);
      
      await refetchRewards();
      
      toast({
        title: "Reward Used",
        description: `You used ${reward.title}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error using reward:', error);
      
      toast({
        title: "Error",
        description: "Failed to use reward. Please try again.",
        variant: "destructive",
      });
      
      return false;
    }
  };
  
  return {
    rewards,
    isLoading,
    error,
    saveReward,
    deleteReward,
    buyReward,
    useReward,
    refetchRewards,
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints,
    refreshPointsFromDatabase,
    setPointsOptimistically,
    setDomPointsOptimistically
  };
}
