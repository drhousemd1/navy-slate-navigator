
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types'; // Assuming this type exists
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';
import { getProfilePointsQueryKey, ProfilePointsData, PROFILE_POINTS_QUERY_KEY_BASE } from '@/data/points/usePointsManager';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries'; // Assuming this query key exists

export interface RedeemRewardVariables {
  rewardId: string;
  cost: number;
  isDomReward: boolean; // If true, costs DOM points, otherwise SUB points
  // We need the current user's ID and their current points to correctly calculate new totals.
  // These should be fetched just before calling the mutation or passed in.
  profileId: string;
  currentSubPoints: number;
  currentDomPoints: number;
}

interface RedeemRewardContext {
  previousRewards?: Reward[];
  previousProfilePointsForCurrentUser?: ProfilePointsData;
  previousProfilePointsForTargetUser?: ProfilePointsData; // If admin redeems for another user
}

export const useRedeemRewardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RedeemRewardVariables, RedeemRewardContext>({
    mutationFn: async (variables: RedeemRewardVariables) => {
      const { rewardId, cost, isDomReward, profileId, currentSubPoints, currentDomPoints } = variables;

      console.log("Redeeming reward:", variables);

      const { data: rewardToUpdate, error: fetchError } = await supabase
        .from('rewards')
        .select('supply, title')
        .eq('id', rewardId)
        .single();

      if (fetchError || !rewardToUpdate) {
        throw new Error(fetchError?.message || 'Reward not found.');
      }

      if (rewardToUpdate.supply <= 0) {
        throw new Error(`${rewardToUpdate.title} is out of stock.`);
      }

      let newSubPoints = currentSubPoints;
      let newDomPoints = currentDomPoints;

      if (isDomReward) {
        if (currentDomPoints < cost) {
          throw new Error('Not enough DOM points to redeem this reward.');
        }
        newDomPoints -= cost;
      } else {
        if (currentSubPoints < cost) {
          throw new Error('Not enough points to redeem this reward.');
        }
        newSubPoints -= cost;
      }

      // 1. Update reward supply
      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: rewardToUpdate.supply - 1, updated_at: new Date().toISOString() })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

      // 2. Update user's points
      // The profile update is handled by updateProfilePoints which is called after this function
      const { error: pointsUpdateError } = await supabase
        .from('profiles')
        .update({ 
          points: newSubPoints, 
          dom_points: newDomPoints, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', profileId);
      
      if (pointsUpdateError) throw pointsUpdateError;
      
      // 3. Update cache using updateProfilePoints
      await updateProfilePoints(profileId, newSubPoints, newDomPoints);

      // Optional: Log reward redemption in a history table if one exists
    },
    onMutate: async (variables: RedeemRewardVariables) => {
      const { profileId, rewardId, cost, isDomReward } = variables;
      const targetUserKey = getProfilePointsQueryKey(profileId);
      
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: targetUserKey });
      await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousProfilePointsForTargetUser = queryClient.getQueryData<ProfilePointsData>(targetUserKey);
      
      // Optimistic update for rewards list
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(r => r.id === rewardId ? { ...r, supply: Math.max(0, (r.supply || 0) - 1) } : r)
      );

      // Optimistic update for points
      const oldPointsData = previousProfilePointsForTargetUser || { points: variables.currentSubPoints, dom_points: variables.currentDomPoints };
      let optimisticSubPoints = oldPointsData.points || 0;
      let optimisticDomPoints = oldPointsData.dom_points || 0;

      if (isDomReward) {
        optimisticDomPoints = (oldPointsData.dom_points || 0) - cost;
      } else {
        optimisticSubPoints = (oldPointsData.points || 0) - cost;
      }
      
      queryClient.setQueryData<ProfilePointsData>(targetUserKey, {
        points: optimisticSubPoints,
        dom_points: optimisticDomPoints,
      });
      queryClient.setQueryData(["rewards", "points", profileId], optimisticSubPoints);
      queryClient.setQueryData(["rewards", "dom_points", profileId], optimisticDomPoints);

      const {data: { user: currentUser }} = await supabase.auth.getUser();
      if (currentUser && currentUser.id === profileId) {
        queryClient.setQueryData([PROFILE_POINTS_QUERY_KEY_BASE], {
             points: optimisticSubPoints,
             dom_points: optimisticDomPoints,
        });
      }

      return { previousRewards, previousProfilePointsForTargetUser };
    },
    onSuccess: (_data, variables) => {
      toast({ title: 'Reward Redeemed!', description: 'Your points and reward supply have been updated.' });
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(variables.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      // Invalidate other relevant keys like metrics if needed
    },
    onError: (error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousProfilePointsForTargetUser) {
        const targetUserKey = getProfilePointsQueryKey(variables.profileId);
        queryClient.setQueryData<ProfilePointsData>(targetUserKey, context.previousProfilePointsForTargetUser);
        queryClient.setQueryData(["rewards", "points", variables.profileId], context.previousProfilePointsForTargetUser.points);
        queryClient.setQueryData(["rewards", "dom_points", variables.profileId], context.previousProfilePointsForTargetUser.dom_points);
      }
      
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] }); // Ensure base is fresh after error
      toast({ title: 'Error Redeeming Reward', description: error.message, variant: 'destructive' });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(variables.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
    }
  });
};
