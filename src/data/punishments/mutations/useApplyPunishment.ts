
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { PROFILE_POINTS_QUERY_KEY, ProfilePointsData } from '@/data/points/usePointsManager'; // Import ProfilePointsData
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
  previousProfilePoints?: ProfilePointsData; // Added for optimistic point updates
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints: initialSubPoints, domPoints: initialProfileDomPoints } = args;

        const newSubPoints = initialSubPoints - costPoints;
        let finalPartnerDomPoints = 0; // To store the dominant partner's new dom_points

        // Update submissive's profile (points deduction)
        const { error: subProfileError } = await supabase
            .from('profiles')
            .update({ points: newSubPoints, updated_at: new Date().toISOString() })
            .eq('id', profileId);
        if (subProfileError) throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);

        // Handle dominant partner's points
        const { data: submissiveUserProfile, error: submissiveUserError } = await supabase
            .from('profiles')
            .select('linked_partner_id')
            .eq('id', profileId)
            .single();

        if (submissiveUserError) throw new Error(`Failed to fetch submissive user profile: ${submissiveUserError.message}`);

        if (submissiveUserProfile?.linked_partner_id) {
            const partnerId = submissiveUserProfile.linked_partner_id;
            const { data: partnerProfile, error: partnerProfileError } = await supabase
                .from('profiles')
                .select('dom_points')
                .eq('id', partnerId)
                .single();

            if (partnerProfileError) throw new Error(`Failed to fetch partner profile: ${partnerProfileError.message}`);
            
            if (partnerProfile) {
                const currentPartnerDomPoints = partnerProfile.dom_points || 0;
                finalPartnerDomPoints = currentPartnerDomPoints + domEarn;
                const { error: domProfileError } = await supabase
                    .from('profiles')
                    .update({ dom_points: finalPartnerDomPoints, updated_at: new Date().toISOString() })
                    .eq('id', partnerId);
                if (domProfileError) throw new Error(`Failed to update dominant profile: ${domProfileError.message}`);
            }
        } else {
          // No linked partner, domEarn might apply to the submissive if they are also dom, or is lost.
          // Current logic: if no partner, finalPartnerDomPoints remains 0 (or rather, dom points aren't given to a separate partner)
          // If the submissive themselves can earn dom_points from their own punishment:
          // finalSelfDomPoints = initialProfileDomPoints + domEarn;
          // And update profileId's dom_points. This depends on product logic.
          // For now, assuming domEarn is for a distinct partner.
        }

        // Record punishment history
        const historyEntry: Omit<PunishmentHistoryItem, 'id' | 'applied_date'> & { punishment_id: string; applied_date?: string } = {
            punishment_id: punishmentId, 
            applied_date: new Date().toISOString(),
            points_deducted: costPoints,
            day_of_week: new Date().getDay(), 
        };
        const { error: historyError } = await supabase.from('punishment_history').insert(historyEntry).select().single();
        if (historyError) throw new Error(`Failed to record punishment history: ${historyError.message}`);

        // Update local cache for the logged-in user's points
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            if (currentUser.id === profileId) {
                // Current user is the submissive who got punished.
                // Their sub_points changed. Their dom_points (initialProfileDomPoints) remain their own unless they are also the dom.
                await updateProfilePoints(newSubPoints, initialProfileDomPoints);
            } else if (submissiveUserProfile?.linked_partner_id && currentUser.id === submissiveUserProfile.linked_partner_id) {
                // Current user is the dominant partner.
                // Their dom_points changed. Their sub_points are their own.
                const { data: domPartnerCurrentProfile, error: domPartnerCurrentProfileError } = await supabase
                    .from('profiles')
                    .select('points') // dom partner's own sub_points
                    .eq('id', currentUser.id)
                    .single();
                
                if (domPartnerCurrentProfileError) {
                    console.error("Failed to fetch dominant partner's current sub_points for cache update:", domPartnerCurrentProfileError.message);
                    // Potentially use a fallback or throw, for now, let invalidation handle if this fails
                    // For optimistic, this would be an issue. For this direct update, it means cache might be slightly off until invalidation.
                }
                const domPartnerCurrentSubPoints = domPartnerCurrentProfile?.points ?? 0;
                await updateProfilePoints(domPartnerCurrentSubPoints, finalPartnerDomPoints);
            }
            // If current user is neither, their points view is not directly updated here; rely on invalidations.
        }
    },
    onMutate: async (args: ApplyPunishmentArgs) => {
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

      // Optimistic update for profile points
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      const previousProfilePoints = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY);

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (currentUser && currentUser.id === args.profileId) {
        // Current user is the submissive being punished. Optimistically update their points.
        queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, (oldData) => {
          const currentSubPoints = oldData?.points ?? args.subPoints;
          const currentDomPoints = oldData?.dom_points ?? args.domPoints; // Submissive's own dom_points
          return {
            points: currentSubPoints - args.costPoints,
            dom_points: currentDomPoints, // Submissive's own dom_points don't change from this specific action
          };
        });
      }
      // Optimistic update for the dominant partner is more complex here without knowing their original sub_points
      // and confirming their identity without an async call. We'll rely on the mutationFn's `updateProfilePoints`
      // and subsequent invalidations for the dominant partner's view if they are the current user.

      return { previousHistory, optimisticHistoryId, previousProfilePoints };
    },
    onError: (error, _args, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      if (context?.previousProfilePoints) { // Rollback optimistic point update
        queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, context.previousProfilePoints);
      }
      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async () => {
      // Invalidate queries to refetch data
      // Order of invalidation might matter if one depends on another, but generally these are independent enough.
      await queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); // If punishments list shows supply or related data
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: () => {
      // It's good practice to invalidate all related keys in onSettled
      // to ensure data consistency whether the mutation succeeded or failed (after potential rollbacks).
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    }
  });
};
