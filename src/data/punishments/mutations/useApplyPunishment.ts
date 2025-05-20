import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { PROFILE_POINTS_QUERY_KEY } from '@/data/points/usePointsManager';

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
        
        // Prepare payload for updating the submissive user's profile
        let submissiveProfileUpdatePayload: { points: number; dom_points?: number; updated_at: string } = {
            points: newSubPoints,
            updated_at: new Date().toISOString(),
        };

        const { data: userProfileData, error: userProfileFetchError } = await supabase
            .from('profiles')
            .select('linked_partner_id')
            .eq('id', profileId)
            .single();

        if (userProfileFetchError) {
            console.error("Error fetching submissive's profile for partner check:", userProfileFetchError);
            throw new Error(`Failed to fetch user profile data: ${userProfileFetchError.message}`);
        }

        if (userProfileData?.linked_partner_id) {
            // Dominant partner exists, update their dom_points
            const { data: partnerProfile, error: partnerProfileError } = await supabase
                .from('profiles')
                .select('dom_points')
                .eq('id', userProfileData.linked_partner_id)
                .single();

            if (partnerProfileError) {
                console.error("Error fetching partner profile:", partnerProfileError);
                throw new Error(`Failed to fetch partner profile: ${partnerProfileError.message}`);
            }
            
            if (partnerProfile) {
                const currentPartnerDomPoints = partnerProfile.dom_points || 0;
                const newPartnerDomPoints = currentPartnerDomPoints + domEarn;
                const { error: domProfileError } = await supabase
                    .from('profiles')
                    .update({ dom_points: newPartnerDomPoints, updated_at: new Date().toISOString() })
                    .eq('id', userProfileData.linked_partner_id);
                if (domProfileError) {
                    console.error("Error updating dominant partner profile:", domProfileError);
                    throw new Error(`Failed to update dominant partner profile: ${domProfileError.message}`);
                }
            }
        } else {
            // No linked partner, so the submissive user (profileId) earns the dom_points themselves
            const newOwnDomPoints = (initialDomPoints || 0) + domEarn;
            submissiveProfileUpdatePayload.dom_points = newOwnDomPoints;
        }

        // Update the submissive user's profile (points and potentially dom_points)
        const { error: subProfileError } = await supabase
            .from('profiles')
            .update(submissiveProfileUpdatePayload)
            .eq('id', profileId);

        if (subProfileError) {
            console.error("Error updating submissive profile:", subProfileError);
            throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);
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
            console.error("Error recording punishment history:", historyError);
            throw new Error(`Failed to record punishment history: ${historyError.message}`);
        }

        // Cache updates for points will be handled by query invalidation in onSuccess/onSettled
        // No need to call updateProfilePoints here manually.
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
      console.error("useApplyPunishment onError:", error);
    },
    onSuccess: async () => {
      toast({ title: 'Punishment applied successfully!' }); // This toast shows after successful mutation
      // Invalidate queries to refetch data. This will update the points bubble.
      await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      console.log("useApplyPunishment onSuccess: Queries invalidated including PROFILE_POINTS_QUERY_KEY");
    },
    onSettled: () => {
      // It's good practice to also invalidate in onSettled for cleanup,
      // though onSuccess usually covers successful cases.
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY }); 
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      console.log("useApplyPunishment onSettled: Queries invalidated including PROFILE_POINTS_QUERY_KEY");
    }
  });
};
