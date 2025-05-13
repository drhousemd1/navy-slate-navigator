
import React, { useEffect } from 'react';
import { usePersistentQuery as useQuery } from '@/data/queries/usePersistentQuery';
import { useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { Reward } from '@/lib/rewardUtils';
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  REWARDS_SUPPLY_QUERY_KEY,
  fetchRewards,
  fetchUserPoints,
  fetchUserDomPoints,
  fetchTotalRewardsSupply
} from './queries';
import {
  saveRewardMutation,
  deleteRewardMutation,
  buyRewardMutation,
  useRewardMutation,
  updateUserPointsMutation
} from './mutations';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { usePointsManagement } from '@/contexts/rewards/usePointsManagement';
import { supabase } from '@/integrations/supabase/client';

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { totalPoints, domPoints, updatePointsInDatabase, updateDomPointsInDatabase, refreshPointsFromDatabase } = usePointsManagement();
  const [localRewards, setLocalRewards] = React.useState<Reward[]>([]);

  // Query for fetching all rewards
  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    error: rewardsError,
    refetch: refetchRewards
  } = useQuery({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    ...STANDARD_QUERY_CONFIG
  });

  // Set local rewards whenever server data changes
  useEffect(() => {
    if (rewards.length > 0) {
      setLocalRewards(rewards);
    }
  }, [rewards]);

  // Query for fetching total rewards supply
  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery({
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply,
    ...STANDARD_QUERY_CONFIG
  });
  
  // Calculate total dom rewards supply
  const totalDomRewardsSupply = React.useMemo(() => {
    return localRewards.reduce((total, reward) => {
      return total + (reward.is_dom_reward ? reward.supply : 0);
    }, 0);
  }, [localRewards]);

  // Setup real-time subscriptions to rewards table
  useEffect(() => {
    const rewardsChannel = supabase
      .channel('rewards-changes')
      .on('postgres_changes', 
        {
          event: '*', 
          schema: 'public',
          table: 'rewards'
        }, 
        (payload) => {
          console.log('Real-time rewards update:', payload);
          // Force refetch when rewards table changes
          refetchRewards();
          refetchSupply();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rewardsChannel);
    };
  }, [refetchRewards, refetchSupply]);

  // Setup real-time subscriptions to profiles table for points updates
  useEffect(() => {
    // Use getSession instead of getUser as it returns a synchronous result
    const sessionData = supabase.auth.getSession();
    
    sessionData.then(({ data }) => {
      const userId = data?.session?.user.id;
      
      if (!userId) return;

      const pointsChannel = supabase
        .channel('profiles-changes')
        .on('postgres_changes', 
          {
            event: 'UPDATE', 
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
          }, 
          (payload) => {
            console.log('Real-time points update:', payload);
            // Refresh points when profile is updated
            refreshPointsFromDatabase();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(pointsChannel);
      };
    });
  }, [refreshPointsFromDatabase]);

  // Optimistic update setters
  const setRewardsOptimistically = (newRewards: Reward[]) => {
    setLocalRewards(newRewards);
    queryClient.setQueryData(REWARDS_QUERY_KEY, newRewards);
  };

  const setPointsOptimistically = (points: number) => {
    queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, points);
  };

  const setDomPointsOptimistically = (points: number) => {
    queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, points);
  };

  // Configure mutations with toast disabled in the handlers
  const saveRewardMut = useMutation({
    mutationFn: saveRewardMutation(queryClient, false),
    // Removed query invalidation since we're using direct cache updates in the mutation
  });

  const deleteRewardMut = useMutation({
    mutationFn: deleteRewardMutation(queryClient, false),
    // Removed query invalidation since we're using direct cache updates in the mutation
  });

  const buyRewardMut = useMutation({
    mutationFn: buyRewardMutation(queryClient)
    // Direct cache updates in the mutation
  });

  const useRewardMut = useMutation({
    mutationFn: useRewardMutation(queryClient)
    // Direct cache updates in the mutation
  });

  const updatePointsMut = useMutation({
    mutationFn: updateUserPointsMutation(queryClient)
    // Direct cache updates in the mutation
  });

  const refetchRewardsTyped = (options?: RefetchOptions) => {
    return refetchRewards(options) as Promise<QueryObserverResult<Reward[], Error>>;
  };

  return {
    // Data
    rewards: localRewards, // Use local state for immediate updates
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints,
    
    // Loading state
    isLoading: rewardsLoading,
    error: rewardsError,
    
    // Mutations
    saveReward: saveRewardMut.mutateAsync,
    deleteReward: deleteRewardMut.mutateAsync,
    buyReward: buyRewardMut.mutateAsync,
    useReward: useRewardMut.mutateAsync,
    updatePoints: updatePointsMut.mutateAsync,
    updateDomPoints: updateDomPointsInDatabase,
    
    // Optimistic update setters
    setRewardsOptimistically,
    setPointsOptimistically,
    setDomPointsOptimistically,
    
    // Refetch functions - maintained for compatibility
    refetchRewards: refetchRewardsTyped,
    refetchPoints: refreshPointsFromDatabase,
    refreshPointsFromDatabase
  };
};
