import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { getProfilePointsQueryKey, ProfilePointsData, PROFILE_POINTS_QUERY_KEY_BASE } from '@/data/points/usePointsManager'; 
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';

// Define necessary keys directly or ensure they are imported from a valid source
const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics']; 
const MONTHLY_METRICS_QUERY_KEY = ['monthly-metrics'];
const WEEKLY_METRICS_SUMMARY_QUERY_KEY = ['weekly-metrics-summary'];

interface ApplyPunishmentContext {
  previousHistory?: PunishmentHistoryItem[];
  optimisticHistoryId?: string;
  // This would be the points state for the *current authenticated user* before optimistic update
  previousProfilePointsForCurrentUser?: ProfilePointsData;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        console.log("Applying punishment with args:", args);
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints: initialSubPoints, domPoints: initialProfileDomPoints } = args;

        try {
            const newSubPoints = initialSubPoints - costPoints;
            let finalPartnerDomPoints = 0; 
            let dominantPartnerId: string | null = null;

            const { error: subProfileError } = await supabase
                .from('profiles')
                .update({ points: newSubPoints, updated_at: new Date().toISOString() }) 
                .eq('id', profileId);
            if (subProfileError) {
                console.error("Failed to update submissive profile:", subProfileError);
                throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);
            }

            const { data: submissiveUserProfile, error: submissiveUserError } = await supabase
                .from('profiles')
                .select('linked_partner_id')
                .eq('id', profileId)
                .single();

            if (submissiveUserError) {
                console.error("Failed to fetch submissive user profile:", submissiveUserError);
                throw new Error(`Failed to fetch submissive user profile: ${submissiveUserError.message}`);
            }

            if (submissiveUserProfile?.linked_partner_id) {
                dominantPartnerId = submissiveUserProfile.linked_partner_id;
                const { data: partnerProfile, error: partnerProfileError } = await supabase
                    .from('profiles')
                    .select('dom_points')
                    .eq('id', dominantPartnerId)
                    .single();

                if (partnerProfileError) {
                    console.error("Failed to fetch partner profile:", partnerProfileError);
                    throw new Error(`Failed to fetch partner profile: ${partnerProfileError.message}`);
                }
                
                if (partnerProfile) {
                    const currentPartnerDomPoints = partnerProfile.dom_points || 0;
                    finalPartnerDomPoints = currentPartnerDomPoints + domEarn;
                    const { error: domProfileError } = await supabase
                        .from('profiles')
                        .update({ dom_points: finalPartnerDomPoints, updated_at: new Date().toISOString() })
                        .eq('id', dominantPartnerId);
                    if (domProfileError) {
                        console.error("Failed to update dominant profile:", domProfileError);
                        throw new Error(`Failed to update dominant profile: ${domProfileError.message}`);
                    }
                }
            }

            const historyEntry: Omit<PunishmentHistoryItem, 'id' | 'applied_date'> & { punishment_id: string; applied_date?: string } = {
                punishment_id: punishmentId, 
                applied_date: new Date().toISOString(),
                points_deducted: costPoints,
                day_of_week: new Date().getDay(), 
            };
            const { error: historyError } = await supabase.from('punishment_history').insert(historyEntry).select().single();
            if (historyError) {
                console.error("Failed to record punishment history:", historyError);
                throw new Error(`Failed to record punishment history: ${historyError.message}`);
            }

            // Update caches using updateProfilePoints
            // For submissive:
            console.log("Updating submissive (profileId) points in mutationFn:", profileId, newSubPoints, initialProfileDomPoints);
            await updateProfilePoints(profileId, newSubPoints, initialProfileDomPoints);

            // For dominant partner (if exists and points changed):
            if (dominantPartnerId && domEarn > 0) {
                 const { data: domPartnerCurrentProfile, error: domPartnerCurrentProfileError } = await supabase
                    .from('profiles')
                    .select('points') // Need current sub_points of dominant to pass to updateProfilePoints
                    .eq('id', dominantPartnerId)
                    .single();
                
                if (domPartnerCurrentProfileError) throw domPartnerCurrentProfileError;
                
                const domPartnerCurrentSubPoints = domPartnerCurrentProfile?.points ?? 0;
                console.log("Updating dominant partner points in mutationFn:", dominantPartnerId, domPartnerCurrentSubPoints, finalPartnerDomPoints);
                await updateProfilePoints(dominantPartnerId, domPartnerCurrentSubPoints, finalPartnerDomPoints);
            }
        } catch (error) {
            console.error("Error in useApplyPunishment mutationFn:", error);
            throw error;
        }
    },
    onMutate: async (args: ApplyPunishmentArgs) => {
      const currentAuthUserKey = getProfilePointsQueryKey(); // Key for the current authenticated user

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

      // Cancel queries for the current authenticated user's points
      await queryClient.cancelQueries({ queryKey: currentAuthUserKey });
      const previousProfilePointsForCurrentUser = queryClient.getQueryData<ProfilePointsData>(currentAuthUserKey);
      
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            const { data: submissiveUserProfileForOptimistic } = await supabase
                .from('profiles')
                .select('linked_partner_id')
                .eq('id', args.profileId) // args.profileId is the submissive's ID
                .single();

            // Optimistic update for the current authenticated user
            if (currentUser.id === args.profileId) { // Current user is the submissive
              console.log("Optimistically updating current user (submissive) points");
              queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, (oldData) => {
                const currentSubPoints = oldData?.points ?? args.subPoints;
                const currentDomPoints = oldData?.dom_points ?? args.domPoints;
                return {
                  points: currentSubPoints - args.costPoints,
                  dom_points: currentDomPoints, 
                };
              });
              // Legacy keys for current user (submissive)
              queryClient.setQueryData(["rewards", "points", currentUser.id], (oldVal?: number) => (oldVal ?? args.subPoints) - args.costPoints);
              queryClient.setQueryData(["rewards", "dom_points", currentUser.id], (oldVal?: number) => oldVal ?? args.domPoints);

            } else if (submissiveUserProfileForOptimistic?.linked_partner_id && currentUser.id === submissiveUserProfileForOptimistic.linked_partner_id) { // Current user is the dominant partner
              console.log("Optimistically updating current user (dominant partner) DOM points");
              queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, (oldData) => {
                const currentDomSubPoints = oldData?.points ?? 0; 
                const currentDomDomPoints = oldData?.dom_points ?? 0; 
                return {
                  points: currentDomSubPoints, 
                  dom_points: currentDomDomPoints + args.domEarn, 
                };
              });
              // Legacy keys for current user (dominant)
              queryClient.setQueryData(["rewards", "dom_points", currentUser.id], (oldVal?: number) => (oldVal ?? 0) + args.domEarn);
              // Dominant's sub points legacy key remains unchanged if not affected
            }
        }
      } catch (error) {
        console.error("Error in optimistic update (useApplyPunishment):", error);
      }

      return { previousHistory, optimisticHistoryId, previousProfilePointsForCurrentUser };
    },
    onError: (error, _args, context) => {
      console.error("Error in useApplyPunishment onError:", error);
      const currentAuthUserKey = getProfilePointsQueryKey(); // Key for the current authenticated user

      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      
      if (context?.previousProfilePointsForCurrentUser) {
        queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, context.previousProfilePointsForCurrentUser);
        // Rollback legacy keys for current user
        queryClient.setQueryData(["rewards", "points", currentAuthUserKey[1]], context.previousProfilePointsForCurrentUser.points); // currentAuthUserKey[1] is userId or "current_authenticated_user"
        queryClient.setQueryData(["rewards", "dom_points", currentAuthUserKey[1]], context.previousProfilePointsForCurrentUser.dom_points);
      }

      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async (_data, args) => { 
      toast({ title: 'Punishment applied successfully!' });
      // The mutationFn already calls updateProfilePoints for both submissive and dominant (if applicable).
      // Invalidate the general points query key to ensure usePointsManager (used by headers) refreshes.
      await queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      // Explicitly invalidate for the submissive user as well, ensuring their specific cache is fresh.
      await queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(args.profileId) });

      // Attempt to find partner ID to invalidate their points as well
      try {
        const { data: subProfile } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', args.profileId)
          .single();
        if (subProfile?.linked_partner_id) {
          const partnerId = subProfile.linked_partner_id;
          await queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(partnerId) });
        }
      } catch (e) {
        console.warn("Could not fetch partner ID in onSuccess for invalidation:", e);
      }
    },
    onSettled: async (_data, _error, args) => {
      // Invalidate points for all potentially affected users to ensure consistency.
      // Invalidate for the submissive
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(args.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["profile", args.profileId]});

      // Attempt to find partner ID to invalidate their points as well
      let partnerIdInvalidated = false;
      try {
        const { data: subProfile } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', args.profileId)
          .single();
        if (subProfile?.linked_partner_id) {
          const partnerId = subProfile.linked_partner_id;
          queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(partnerId) });
          queryClient.invalidateQueries({ queryKey: ["rewards", "points", partnerId] });
          queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", partnerId] });
          queryClient.invalidateQueries({ queryKey: ["profile", partnerId]});
          partnerIdInvalidated = true;
        }
      } catch (e) {
        console.warn("Could not fetch partner ID in onSettled for invalidation:", e);
      }
      
      // Always invalidate the base key for usePointsManager,
      // covering the current user regardless of their role in the punishment
      // or if partner lookup failed.
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      
      // Fallback broad invalidations if specific partner invalidation might have been missed
      if (!partnerIdInvalidated) {
          queryClient.invalidateQueries({ queryKey: ["rewards"] }); // Broad invalidation for rewards related keys
          queryClient.invalidateQueries({ queryKey: ["profile"] }); // Broad invalidation for profile related keys
      }
      
      // Other related queries
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] }); // Ensure consistency with defined key
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] }); // Ensure consistency with defined key
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] }); // Ensure consistency with defined key
    }
  });
};
