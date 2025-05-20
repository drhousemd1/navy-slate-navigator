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
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        console.log("Applying punishment with args:", args);
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints: initialSubPoints, domPoints: initialProfileDomPoints } = args;

        try {
            const newSubPoints = initialSubPoints - costPoints;
            let finalPartnerDomPoints = 0; // To store the dominant partner's new dom_points

            // Update submissive's profile (points deduction)
            const { error: subProfileError } = await supabase
                .from('profiles')
                .update({ points: newSubPoints, updated_at: new Date().toISOString() })
                .eq('id', profileId);
            if (subProfileError) {
                console.error("Failed to update submissive profile:", subProfileError);
                throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);
            }

            // Handle dominant partner's points
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

            // Record punishment history
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

            // Update local cache for the logged-in user's points
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.error("Failed to get current user:", userError);
                throw new Error(`Failed to get current user: ${userError.message}`);
            }
            
            if (currentUser) {
                console.log("Current user ID:", currentUser.id, "Submissive ID:", profileId);
                if (currentUser.id === profileId) {
                    // Current user is the submissive who got punished
                    console.log("Updating submissive points:", newSubPoints, initialProfileDomPoints);
                    await updateProfilePoints(newSubPoints, initialProfileDomPoints);
                } else if (submissiveUserProfile?.linked_partner_id && currentUser.id === submissiveUserProfile.linked_partner_id) {
                    // Current user is the dominant partner
                    try {
                        const { data: domPartnerCurrentProfile, error: domPartnerCurrentProfileError } = await supabase
                            .from('profiles')
                            .select('points') 
                            .eq('id', currentUser.id)
                            .single();
                        
                        if (domPartnerCurrentProfileError) {
                            console.error("Failed to fetch dominant partner's current sub_points:", domPartnerCurrentProfileError);
                            throw domPartnerCurrentProfileError;
                        }
                        
                        const domPartnerCurrentSubPoints = domPartnerCurrentProfile?.points ?? 0;
                        console.log("Updating dominant points:", domPartnerCurrentSubPoints, finalPartnerDomPoints);
                        await updateProfilePoints(domPartnerCurrentSubPoints, finalPartnerDomPoints);
                    } catch (err) {
                        console.error("Error updating dominant partner points:", err);
                        // Still continue as we'll do a full invalidation later
                    }
                } else {
                    // Current user is neither - we'll rely on invalidations
                    console.log("Current user is neither submissive nor dominant, invalidating queries");
                }
            } else {
                console.warn("No authenticated user found");
            }
        } catch (error) {
            console.error("Error in useApplyPunishment mutation:", error);
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

      // Optimistic update for profile points
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      const previousProfilePoints = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY);

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser && currentUser.id === args.profileId) {
          // Current user is the submissive being punished. Optimistically update their points.
          console.log("Optimistically updating submissive points");
          queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, (oldData) => {
            const currentSubPoints = oldData?.points ?? args.subPoints;
            const currentDomPoints = oldData?.dom_points ?? args.domPoints;
            return {
              points: currentSubPoints - args.costPoints,
              dom_points: currentDomPoints,
            };
          });
          
          // Also update legacy keys
          queryClient.setQueryData(["rewards", "points"], (oldData?: number) => {
            const currentSubPoints = oldData ?? args.subPoints;
            return currentSubPoints - args.costPoints;
          });
        }
      } catch (error) {
        console.error("Error in optimistic update:", error);
      }

      return { previousHistory, optimisticHistoryId, previousProfilePoints };
    },
    onError: (error, _args, context) => {
      console.error("Error in punishment application:", error);
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      if (context?.previousProfilePoints) {
        queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, context.previousProfilePoints);
        // Also rollback legacy keys if they exist
        const points = context.previousProfilePoints.points;
        const domPoints = context.previousProfilePoints.dom_points;
        queryClient.setQueryData(["rewards", "points"], points);
        queryClient.setQueryData(["rewards", "dom_points"], domPoints);
      }
      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async () => {
      toast({ title: 'Punishment applied successfully!' });
      
      // Do invalidations after a short delay to ensure all updates are processed
      setTimeout(async () => {
        // Invalidate all points-related queries for both contexts
        await queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: ["rewards", "points"] });
        await queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points"] });
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
        
        // Invalidate other related queries
        await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      }, 100);
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
