import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { PROFILE_POINTS_QUERY_KEY } from '@/data/points/usePointsManager';
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';

// Define necessary keys directly or ensure they are imported from a valid source
// const PROFILE_QUERY_KEY = ['profile']; // Replaced by PROFILE_POINTS_QUERY_KEY for points display
// const REWARDS_POINTS_QUERY_KEY = ['rewardsPoints']; // Replaced
// const REWARDS_DOM_POINTS_QUERY_KEY = ['rewardsDomPoints']; // Replaced
const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics']; // For Throne Room
const MONTHLY_METRICS_QUERY_KEY = ['monthly-metrics']; // For Throne Room
const WEEKLY_METRICS_SUMMARY_QUERY_KEY = ['weekly-metrics-summary']; // For Throne Room


interface ApplyPunishmentContext {
  previousHistory?: PunishmentHistoryItem[];
  optimisticHistoryId?: string;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints: initialSubPoints, domPoints: initialDomPoints } = args;

        const newSubPoints = initialSubPoints - costPoints;
        let finalDomPoints = initialDomPoints; // Initialize with current dom points

        const { error: subProfileError } = await supabase
            .from('profiles')
            .update({ points: newSubPoints, updated_at: new Date().toISOString() })
            .eq('id', profileId);
        if (subProfileError) throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);

        const { data: userProfile } = await supabase.from('profiles').select('linked_partner_id').eq('id', profileId).single();
        if (userProfile?.linked_partner_id) {
            const { data: partnerProfile, error: partnerProfileError } = await supabase
                .from('profiles')
                .select('dom_points')
                .eq('id', userProfile.linked_partner_id)
                .single();

            if (partnerProfileError) throw new Error(`Failed to fetch partner profile: ${partnerProfileError.message}`);
            
            if (partnerProfile) {
                const currentPartnerDomPoints = partnerProfile.dom_points || 0;
                finalDomPoints = currentPartnerDomPoints + domEarn; // Update finalDomPoints here
                const { error: domProfileError } = await supabase
                    .from('profiles')
                    .update({ dom_points: finalDomPoints, updated_at: new Date().toISOString() })
                    .eq('id', userProfile.linked_partner_id);
                if (domProfileError) throw new Error(`Failed to update dominant profile: ${domProfileError.message}`);
            }
        } else {
          // If there's no linked partner, the 'domEarn' logic might need clarification.
          // For now, we assume if there's no partner, the 'domPoints' passed to updateProfilePoints will be the initialDomPoints.
          // Or, if domEarn is meant for the current user's dom_points if they are also the dominant one (e.g. self-play):
          // finalDomPoints = initialDomPoints + domEarn;
          // const { error: selfDomProfileError } = await supabase
          //   .from('profiles')
          //   .update({ dom_points: finalDomPoints, updated_at: new Date().toISOString() })
          //   .eq('id', profileId); // Update current user's dom_points
          // if (selfDomProfileError) throw new Error(`Failed to update own dominant profile points: ${selfDomProfileError.message}`);
          // This part depends on the intended logic for dom_points when no partner is linked.
          // Assuming for now that dom_points are only for the linked partner.
        }

        const historyEntry: Omit<PunishmentHistoryItem, 'id' | 'applied_date'> & { punishment_id: string; applied_date?: string } = {
            punishment_id: punishmentId, 
            applied_date: new Date().toISOString(),
            points_deducted: costPoints,
            day_of_week: new Date().getDay(), 
        };
        const { error: historyError } = await supabase.from('punishment_history').insert(historyEntry).select().single();
        if (historyError) throw new Error(`Failed to record punishment history: ${historyError.message}`);

        // Directly update the cache using updateProfilePoints
        // If no partner, finalDomPoints would be initialDomPoints.
        // If there is a partner, it's partnerProfile.dom_points + domEarn
        // If the current user *is* the dominant and receives points, that needs specific handling.
        // Assuming `finalDomPoints` reflects the dominant partner's new total,
        // and `newSubPoints` is the submissive's new total.
        // The `updateProfilePoints` function updates the *current user's* view of their points.
        // If the current user is the submissive, their `dom_points` field in `profiles` table might not change here,
        // unless they are also acting as a dominant in some context.
        // `updateProfilePoints` updates the local cache for `PROFILE_POINTS_QUERY_KEY`.
        // We need to ensure it updates the correct values based on whose points changed.
        // If the logged-in user is the SUBMISSIVE, their `points` change. Their `dom_points` might not.
        // If the logged-in user is the DOMINANT, their `dom_points` change. Their `points` (sub_points) might not.

        // Let's get the current user's ID again to be sure whose points we are updating in the cache.
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            if (currentUser.id === profileId) { // Current user is the submissive who got punished
                await updateProfilePoints(newSubPoints, initialDomPoints); // Their sub points change, their dom points (if any) don't change from *this* action.
            } else if (userProfile?.linked_partner_id && currentUser.id === userProfile.linked_partner_id) { // Current user is the dominant partner
                 await updateProfilePoints(initialSubPoints, finalDomPoints); // Their dom points change, their sub points (if any) don't change from *this* action.
            }
            // Else, if the current user is neither the punished user nor their direct partner,
            // their local point display might not need an immediate update from this specific action,
            // or it implies a more complex relationship not covered here.
            // For now, we assume direct involvement.
        }
    },
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);
      
      const optimisticHistoryId = uuidv4();
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: optimisticHistoryId,
        punishment_id: args.id, 
        applied_date: new Date().toISOString(),
        points_deducted: args.costPoints,
        day_of_week: new Date().getDay(), 
      };
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );
      return { previousHistory, optimisticHistoryId };
    },
    onError: (error, _args, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async () => {
      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY }); 
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    }
  });
};
