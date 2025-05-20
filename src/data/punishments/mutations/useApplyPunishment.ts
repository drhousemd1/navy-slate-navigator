import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { PROFILE_POINTS_QUERY_KEY, ProfilePointsData } from '@/data/points/usePointsManager'; 
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';

// Define necessary keys directly or ensure they are imported from a valid source
const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics']; 
const MONTHLY_METRICS_QUERY_KEY = ['monthly-metrics'];
const WEEKLY_METRICS_SUMMARY_QUERY_KEY = ['weekly-metrics-summary'];


interface ApplyPunishmentContext {
  previousHistory?: PunishmentHistoryItem[];
  optimisticHistoryId?: string;
  previousProfilePoints?: ProfilePointsData;
  // Store previous partner profile points if dominant partner is the current user
  previousPartnerProfilePoints?: ProfilePointsData; 
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

            const { error: subProfileError } = await supabase
                .from('profiles')
                .update({ points: newSubPoints, updated_at: new Date().toISOString() }) // Sub's DOM points don't change here
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
                const partnerId = submissiveUserProfile.linked_partner_id;
                const { data: partnerProfile, error: partnerProfileError } = await supabase
                    .from('profiles')
                    .select('dom_points')
                    .eq('id', partnerId)
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
                        .eq('id', partnerId);
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

            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.error("Failed to get current user:", userError);
                throw new Error(`Failed to get current user: ${userError.message}`);
            }
            
            if (currentUser) {
                console.log("Current user ID:", currentUser.id, "Submissive ID:", profileId);
                if (currentUser.id === profileId) {
                    console.log("Updating submissive points in mutationFn:", newSubPoints, initialProfileDomPoints);
                    await updateProfilePoints(newSubPoints, initialProfileDomPoints);
                } else if (submissiveUserProfile?.linked_partner_id && currentUser.id === submissiveUserProfile.linked_partner_id) {
                    try {
                        const { data: domPartnerCurrentProfile, error: domPartnerCurrentProfileError } = await supabase
                            .from('profiles')
                            .select('points') 
                            .eq('id', currentUser.id)
                            .single();
                        
                        if (domPartnerCurrentProfileError) throw domPartnerCurrentProfileError;
                        
                        const domPartnerCurrentSubPoints = domPartnerCurrentProfile?.points ?? 0;
                        console.log("Updating dominant points in mutationFn:", domPartnerCurrentSubPoints, finalPartnerDomPoints);
                        await updateProfilePoints(domPartnerCurrentSubPoints, finalPartnerDomPoints);
                    } catch (err) {
                        console.error("Error updating dominant partner points in mutationFn:", err);
                    }
                }
            } else {
                console.warn("No authenticated user found in mutationFn");
            }
        } catch (error) {
            console.error("Error in useApplyPunishment mutationFn:", error);
            throw error;
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

      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      const previousProfilePoints = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY);
      let previousPartnerProfilePoints: ProfilePointsData | undefined = undefined; // For dominant rollback

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: submissiveUserProfileForOptimistic, error: subUserErrorOptimistic } = await supabase
            .from('profiles')
            .select('linked_partner_id')
            .eq('id', args.profileId) // args.profileId is the submissive's ID
            .single();

        if (subUserErrorOptimistic) {
            console.warn("Optimistic: Could not fetch submissive profile for partner check", subUserErrorOptimistic.message);
        }

        if (currentUser) {
            if (currentUser.id === args.profileId) { // Current user is the submissive
              console.log("Optimistically updating submissive points");
              queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, (oldData) => {
                const currentSubPoints = oldData?.points ?? args.subPoints;
                const currentDomPoints = oldData?.dom_points ?? args.domPoints; // Submissive's own DOM points
                return {
                  points: currentSubPoints - args.costPoints,
                  dom_points: currentDomPoints, // Submissive's DOM points don't change from this action
                };
              });
              queryClient.setQueryData(["rewards", "points"], (oldVal?: number) => (oldVal ?? args.subPoints) - args.costPoints);
              // Submissive's DOM points in legacy key also don't change
              queryClient.setQueryData(["rewards", "dom_points"], (oldVal?: number) => oldVal ?? args.domPoints);

            } else if (submissiveUserProfileForOptimistic?.linked_partner_id && currentUser.id === submissiveUserProfileForOptimistic.linked_partner_id) { // Current user is the dominant partner
              console.log("Optimistically updating dominant partner's DOM points");
              previousPartnerProfilePoints = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY); // Save dominant's current state

              queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, (oldData) => {
                // args.subPoints and args.domPoints are the SUBMISSIVE's points.
                // We need the dominant's current points.
                const currentDomSubPoints = oldData?.points ?? 0; // Dominant's sub points (should be fetched or assumed from cache)
                const currentDomDomPoints = oldData?.dom_points ?? 0; // Dominant's DOM points
                return {
                  points: currentDomSubPoints, // Dominant's sub points don't change
                  dom_points: currentDomDomPoints + args.domEarn, // Dominant's DOM points increase
                };
              });
              // Update legacy keys for dominant partner
              queryClient.setQueryData(["rewards", "dom_points"], (oldVal?: number) => (oldVal ?? 0) + args.domEarn);
            }
        }
      } catch (error) {
        console.error("Error in optimistic update (useApplyPunishment):", error);
      }

      return { previousHistory, optimisticHistoryId, previousProfilePoints, previousPartnerProfilePoints };
    },
    onError: (error, _args, context) => {
      console.error("Error in useApplyPunishment onError:", error);
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      
      // Rollback logic needs to consider whose points were optimistically updated
      if (context?.previousProfilePoints && !context?.previousPartnerProfilePoints) { // Submissive was updated
        queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, context.previousProfilePoints);
        queryClient.setQueryData(["rewards", "points"], context.previousProfilePoints.points);
        queryClient.setQueryData(["rewards", "dom_points"], context.previousProfilePoints.dom_points);
      } else if (context?.previousPartnerProfilePoints) { // Dominant partner was updated
         queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, context.previousPartnerProfilePoints);
         queryClient.setQueryData(["rewards", "points"], context.previousPartnerProfilePoints.points);
         queryClient.setQueryData(["rewards", "dom_points"], context.previousPartnerProfilePoints.dom_points);
      }
      // If both were possibly affected, previousProfilePoints might be the sub's and previousPartnerProfilePoints the dom's.
      // The current logic assumes only one user's points (the current user) are optimistically changed in PROFILE_POINTS_QUERY_KEY.

      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async (_data, args) => { 
      toast({ title: 'Punishment applied successfully!' });
      
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;

            const { data: submissiveUserProfile, error: subUserError } = await supabase
                .from('profiles')
                .select('linked_partner_id, points, dom_points') // Corrected select string
                .eq('id', args.profileId) 
                .single();

            if (subUserError) {
                console.error("onSuccess: Failed to fetch submissive profile for point update check", subUserError);
                // Ensure we also toast or handle this error more visibly if needed
                toast({ title: 'Error', description: `Failed to fetch submissive profile: ${subUserError.message}`, variant: 'destructive' });
                return;
            }
            
            // It's also good to check if submissiveUserProfile is null, in case .single() finds no match but no error.
            if (!submissiveUserProfile) {
                console.error("onSuccess: Submissive profile not found for ID:", args.profileId);
                toast({ title: 'Error', description: 'Submissive profile not found.', variant: 'destructive' });
                return;
            }
            
            if (currentUser.id === args.profileId) { // Current user is submissive
                const finalSubPoints = (submissiveUserProfile.points ?? args.subPoints) - args.costPoints;
                const finalSubDomPoints = submissiveUserProfile.dom_points ?? args.domPoints; 
                console.log("useApplyPunishment onSuccess: Updating submissive points:", finalSubPoints, finalSubDomPoints);
                await updateProfilePoints(finalSubPoints, finalSubDomPoints);
            } else if (submissiveUserProfile.linked_partner_id && currentUser.id === submissiveUserProfile.linked_partner_id) { // Current user is dominant
                const { data: domProfile, error: domError } = await supabase
                    .from('profiles')
                    .select('points, dom_points') // Corrected select string
                    .eq('id', currentUser.id)
                    .single();

                if (domError) {
                    console.error("onSuccess: Failed to fetch dominant profile for point update", domError);
                    toast({ title: 'Error', description: `Failed to fetch dominant profile: ${domError.message}`, variant: 'destructive' });
                    return;
                }
                if (!domProfile) {
                    console.error("onSuccess: Dominant profile not found for ID:", currentUser.id);
                    toast({ title: 'Error', description: 'Dominant profile not found.', variant: 'destructive' });
                    return;
                }
                
                const finalDomSubPoints = domProfile.points ?? 0;
                const finalDomDomPoints = (domProfile.dom_points ?? 0) + args.domEarn;
                console.log("useApplyPunishment onSuccess: Updating dominant points:", finalDomSubPoints, finalDomDomPoints);
                await updateProfilePoints(finalDomSubPoints, finalDomDomPoints);
            }
        } catch (err) {
            console.error("Error in onSuccess of useApplyPunishment during explicit point update:", err);
            if (err instanceof Error) {
              toast({ title: 'Update Error', description: err.message, variant: 'destructive'});
            } else {
              toast({ title: 'Update Error', description: 'An unknown error occurred during point update.', variant: 'destructive'});
            }
        }
    },
    onSettled: () => {
      // Invalidate everything related to points to ensure consistency
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points"] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      
      // Other related queries
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    }
  });
};
