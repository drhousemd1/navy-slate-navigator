
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
    queryKey: ['rewards', 'points'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();
        
      if (error || !data) return 0;
      return data.points || 0;
    },
    staleTime: 300000, // 5 minutes
    enabled: true
  });
  
  // Query for dom points
  const { data: domPointsData } = useQuery({
    queryKey: ['rewards', 'dom-points'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('dom_points')
        .eq('id', user.id)
        .single();
        
      if (error || !data) return 0;
      return data.dom_points || 0;
    },
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
      await queryClient.invalidateQueries({ queryKey: ['rewards', 'points'] });
      await queryClient.invalidateQueries({ queryKey: ['rewards', 'dom-points'] });
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
    // Not implemented in this iteration - would be a dedicated useCreateReward or useUpdateReward hook
    console.error('Save reward not implemented yet');
    return null;
  };
  
  const deleteReward = async (rewardId: string): Promise<boolean> => {
    // Not implemented in this iteration - would be a dedicated useDeleteReward hook
    console.error('Delete reward not implemented yet');
    return false;
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
    // Not implemented yet
    console.error('Use reward not implemented yet');
    return false;
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
