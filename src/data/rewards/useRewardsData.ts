
import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
// import { Reward } from '@/lib/rewardUtils'; // Original problematic import
import { Reward } from '@/data/rewards/types'; // Corrected import path
import { 
  REWARDS_QUERY_KEY, 
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  REWARDS_SUPPLY_QUERY_KEY,
  fetchRewards, // This should be from the centralized queries, not lib/rewardUtils directly
  fetchUserPoints,
  fetchUserDomPoints,
  fetchTotalRewardsSupply
} from './queries'; // Assuming queries.ts exports these
import {
  // These are specific mutation functions, not hooks themselves.
  // The actual mutation hooks (useCreateReward, useUpdateReward, etc.) should be used.
  // This file might be a data handler rather than a context provider itself.
  // Let's assume saveRewardMutation, deleteRewardMutation etc. are functions that return the mutationFn for useMutation.
  // However, the plan is to use hooks directly in components or higher-level hooks.
  // This file might be `RewardsDataHandler.tsx` from the allowed list.
  // I will assume this is `RewardsDataHandler.tsx` for now.
  // The mutations like saveRewardMutation are not defined here.
  // This structure is from the existing code.
  // I will wire it up to the new mutation hooks.
} from './mutations'; // This likely points to an index of mutation hooks

// The following imports are for the actual mutation hooks
import { useCreateRewardMutation, useUpdateRewardMutation, useDeleteRewardMutation } from './mutations'; // from mutations/index.ts
import { useBuySubReward, useBuyDomReward } from '../mutations/useBuySubReward'; // Adjust path if useBuySubReward is in ./mutations
                                                                                // Correcting paths based on where they actually are.
                                                                                // useBuySubReward etc are in data/mutations
import { useRedeemSubReward, useRedeemDomReward } from '../mutations/useRedeemSubReward';


import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { usePointsManagement } from '@/contexts/rewards/usePointsManagement'; // This context might need to be reviewed/phased out
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';


// This hook should align with RewardsDataHandler.tsx's purpose
export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { totalPoints, domPoints, updatePointsInDatabase, updateDomPointsInDatabase, refreshPointsFromDatabase } = usePointsManagement();
  // const [localRewards, setLocalRewards] = React.useState<Reward[]>([]); // Optimistic updates handled by React Query

  const {
    data: rewards = [],
    isLoading: rewardsLoading,
    error: rewardsError,
    refetch: refetchRewardsQuery
  } = useQuery<Reward[]>({ // Added Reward[] type
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards, // from ./queries
    ...STANDARD_QUERY_CONFIG
  });

  // useEffect(() => {
  //   if (rewards.length > 0) {
  //     setLocalRewards(rewards);
  //   }
  // }, [rewards]); // No longer needed with React Query managing cache

  const {
    data: totalRewardsSupply = 0,
    refetch: refetchSupply
  } = useQuery<number>({ // Added number type
    queryKey: REWARDS_SUPPLY_QUERY_KEY,
    queryFn: fetchTotalRewardsSupply, // from ./queries
    ...STANDARD_QUERY_CONFIG
  });
  
  const totalDomRewardsSupply = React.useMemo(() => {
    return rewards.reduce((total, reward) => { // Use 'rewards' from useQuery
      return total + (reward.is_dom_reward ? reward.supply : 0);
    }, 0);
  }, [rewards]);

  useEffect(() => {
    const rewardsChannel = supabase
      .channel('rewards-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rewards' }, 
        (payload) => {
          console.log('Real-time rewards update:', payload);
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
        .channel('profiles-changes')
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
          (payload) => {
            console.log('Real-time points update:', payload);
            refreshPointsFromDatabase(); // This should also invalidate REWARDS_POINTS_QUERY_KEY etc.
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY});
            queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY});
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(pointsChannel);
      };
    });
  }, [queryClient, refreshPointsFromDatabase]);

  // Mutation hooks
  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMut = useDeleteRewardMutation(); // Renamed for clarity

  // Functions for CRUD operations using the new mutations
  const saveReward = async (saveParams: { rewardData: Partial<Reward> & { id?: string } } ) => {
    const { rewardData } = saveParams;
    if (rewardData.id) { // Update
      // Ensure all required fields for UpdateRewardVariables are present or correctly typed
      const updateVariables = { id: rewardData.id, ...rewardData };
      return updateRewardMutation.mutateAsync(updateVariables);
    } else { // Create
      // Ensure all required fields for CreateRewardVariables are present
      const { title, cost, supply, is_dom_reward, ...restData } = rewardData;
      if (title === undefined || cost === undefined || supply === undefined || is_dom_reward === undefined) {
        toast({ title: "Missing required fields for creation", variant: "destructive" });
        throw new Error("Missing required fields for creation");
      }
      const createVariables = { title, cost, supply, is_dom_reward, ...restData };
      return createRewardMutation.mutateAsync(createVariables);
    }
  };

  const deleteReward = async (rewardId: string) => {
    return deleteRewardMut.mutateAsync(rewardId);
  };

  // Buy/Redeem mutations (assuming these are correctly set up)
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
    // Points should be fetched fresh or from a reliable cache, not passed if possible
    // For simplicity, usePointsManagement might be providing these.
    
    if (reward.is_dom_reward) {
      return buyDom({ rewardId, cost, currentSupply: reward.supply, profileId, currentDomPoints: domPoints });
    } else {
      return buySub({ rewardId, cost, currentSupply: reward.supply, profileId, currentPoints: totalPoints });
    }
  };

  const useReward = async ({ rewardId }: { rewardId: string }) => { // Renaming to useReward to match context
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

  // Optimistic setters are usually handled by React Query's setQueryData within mutations.
  // Exposing them directly can be complex to manage.
  // For now, removing direct optimistic setters from here, relying on mutations.
  // const setRewardsOptimistically = (newRewards: Reward[]) => {
  //   queryClient.setQueryData(REWARDS_QUERY_KEY, newRewards);
  // };
  // const setPointsOptimistically = (points: number) => {
  //   queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, points);
  // };
  // const setDomPointsOptimistically = (points: number) => {
  //   queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, points);
  // };


  return {
    rewards,
    totalPoints, // From usePointsManagement
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints, // From usePointsManagement
    isLoading: rewardsLoading,
    error: rewardsError,
    saveReward,
    deleteReward,
    buyReward,
    useReward, // useReward maps to redeem operations
    updatePoints: updatePointsInDatabase, // From usePointsManagement
    updateDomPoints: updateDomPointsInDatabase, // From usePointsManagement
    refetchRewards: refetchRewardsTyped,
    refreshPointsFromDatabase, // From usePointsManagement
    // Removed direct optimistic setters, should be part of mutation logic
    // setRewardsOptimistically, 
    // setPointsOptimistically,
    // setDomPointsOptimistically,
  };
};
