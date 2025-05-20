import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Reward } from "@/data/rewards/types";
import { saveRewardsToDB, savePointsToDB, saveDomPointsToDB } from "../indexedDB/useIndexedDB"; // These seem related to an older IndexedDB persistence, might be redundant with TanStack Persister
import { toast } from "@/hooks/use-toast";
import { PROFILE_POINTS_QUERY_KEY_BASE, getProfilePointsQueryKey } from '@/data/points/usePointsManager'; // Added imports

interface BuyRewardParams {
  rewardId: string;
  cost: number;
  isDomReward?: boolean;
  currentSupply: number; 
  // profileId is fetched inside mutationFn
  // currentPoints are fetched inside mutationFn
}

interface BuyRewardResult {
    updatedReward: Reward;
    newPointsBalance: number; // This is specific to the type of points (sub or dom)
    profileId: string; // Return profileId for invalidation
}

// Optimistic context should reflect the actual data structure being managed by usePointsManager
interface BuyRewardOptimisticContext {
    previousRewards?: Reward[];
    previousProfilePoints?: { points: number, dom_points: number }; // For the specific user
    profileId?: string; // To reconstruct key on error/rollback
}


const buyReward = async ({ rewardId, cost, isDomReward = false, currentSupply }: BuyRewardParams): Promise<BuyRewardResult> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    throw new Error("User not authenticated");
  }
  const profileId = userData.user.id;

  const { data: reward, error: fetchError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!reward) throw new Error("Reward not found to buy.");
  
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('points, dom_points')
    .eq('id', profileId)
    .single();
    
  if (profileError) throw profileError;
  if (!profileData) throw new Error("Profile not found.");

  const userCurrentPoints = isDomReward ? (profileData.dom_points || 0) : (profileData.points || 0);
  if (userCurrentPoints < cost) {
    throw new Error(`Not enough ${isDomReward ? 'dom ' : ''}points to buy this reward. Current: ${userCurrentPoints}, Cost: ${cost}`);
  }
  
  if (reward.supply !== -1 && currentSupply <= 0) {
      throw new Error("Reward is out of stock.");
  }

  const newRewardSupply = reward.supply === -1 ? -1 : currentSupply - 1;

  const { data: updatedRewardData, error: updateError } = await supabase
    .from('rewards')
    .update({ 
      supply: newRewardSupply,
      updated_at: new Date().toISOString()
    })
    .eq('id', rewardId)
    .select()
    .single();
    
  if (updateError) throw updateError;
  if (!updatedRewardData) throw new Error("Failed to update reward after purchase.");
  
  const newPointsBalance = userCurrentPoints - cost;
  const updateProfilePayload = isDomReward ? { dom_points: newPointsBalance } : { points: newPointsBalance };

  const { error: pointsError } = await supabase
    .from('profiles')
    .update({ ...updateProfilePayload, updated_at: new Date().toISOString() })
    .eq('id', profileId);
    
  if (pointsError) {
    await supabase.from('rewards').update({ supply: currentSupply, updated_at: new Date().toISOString() }).eq('id', rewardId);
    throw pointsError;
  }
  
  // Removed direct IndexedDB saves and queryClient.setQueryData, as mutations should rely on onSuccess/onSettled for cache updates.
  // These indexedDB functions (savePointsToDB) are likely part of an older system.
  // If still needed, they should be integrated with TanStack Query's persister or be side effects.
  // For now, focusing on TanStack Query's mechanisms.
  
  return { updatedReward: updatedRewardData as Reward, newPointsBalance, profileId };
};

export function useBuyReward() {
  const queryClient = useQueryClient();

  return useMutation<BuyRewardResult, Error, BuyRewardParams, BuyRewardOptimisticContext>({
    mutationFn: buyReward,
    onMutate: async (variables: BuyRewardParams) => {
        // Need profileId for optimistic update of points.
        // Since buyReward fetches it, optimistic update here is tricky without duplicating that fetch.
        // For a simpler optimistic update, we'd need profileId passed in or a way to get current user's ID synchronously.
        // Let's assume we can get the current user's ID for optimistic update of their points.
        // This part is a common challenge with optimistic updates when required data isn't in variables.
        // For now, we will optimistically update rewards, and let points update via invalidation.
        // Or, if we want optimistic points, buyReward would need to be structured differently or take profileId.
        
        // Fetch current user for optimistic update key
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;
        let profileKey;
        if (currentUserId) {
            profileKey = getProfilePointsQueryKey(currentUserId);
            await queryClient.cancelQueries({ queryKey: profileKey });
        }
        await queryClient.cancelQueries({ queryKey: ['rewards'] });
        await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE]});


        const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);
        const previousProfilePoints = currentUserId ? queryClient.getQueryData<{points: number, dom_points: number}>(profileKey!) : undefined;

        queryClient.setQueryData<Reward[]>(['rewards'], (oldRewards = []) => {
            const updated = oldRewards.map(reward => 
            reward.id === variables.rewardId ? { ...reward, supply: Math.max(0, reward.supply -1) } : reward // Ensure supply doesn't go < 0 if currentSupply was not accurate
            );
            // saveRewardsToDB(updated); // Old IndexedDB call
            return updated;
        });

        if (currentUserId && profileKey && previousProfilePoints) {
            const { data: profileData } = await supabase // Re-fetch for current points for more accurate optimistic update
                .from('profiles')
                .select('points, dom_points')
                .eq('id', currentUserId)
                .single();
            
            if (profileData) {
                queryClient.setQueryData<{points: number, dom_points: number}>(profileKey, (old) => {
                    const basePoints = old ?? profileData;
                    return {
                        points: variables.isDomReward ? (basePoints.points) : (basePoints.points - variables.cost),
                        dom_points: variables.isDomReward ? (basePoints.dom_points - variables.cost) : (basePoints.dom_points),
                    };
                });
            }
        }

        return { previousRewards, previousProfilePoints, profileId: currentUserId };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(['rewards'], (oldRewards = []) => {
        const updatedRewards = oldRewards.map(reward => 
          reward.id === variables.rewardId ? data.updatedReward : reward
        );
        // saveRewardsToDB(updatedRewards); // Old IndexedDB call
        return updatedRewards;
      });

      // Points are updated via invalidation.
      toast({
        title: "Reward Purchased!",
        description: `You bought ${data.updatedReward.title} for ${variables.cost} ${variables.isDomReward ? "DOM " : ""}points.`
      });
    },
    onError: (error, variables, context) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Could not purchase reward.",
        variant: "destructive",
      });
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
      }
      if (context?.profileId && context.previousProfilePoints) {
        queryClient.setQueryData(getProfilePointsQueryKey(context.profileId), context.previousProfilePoints);
      }
      // Fallback invalidation
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      if (context?.profileId) {
          queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(context.profileId) });
      }
    },
    onSettled: (_data, _error, variables) => { // variables is from original call
        // data from mutationFn now includes profileId if successful
        const profileIdToInvalidate = _data?.profileId; 
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
        if (profileIdToInvalidate) {
            queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(profileIdToInvalidate) });
        }
        queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] }); // General one for current user
    }
  });
}
