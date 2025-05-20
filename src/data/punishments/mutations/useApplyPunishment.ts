
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { PROFILE_POINTS_QUERY_KEY } from '@/data/points/usePointsManager';
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';

// Define necessary keys directly or ensure they are imported from a valid source
const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics']; // For Throne Room
const MONTHLY_METRICS_QUERY_KEY = ['monthly-metrics']; // For Throne Room
const WEEKLY_METRICS_SUMMARY_QUERY_KEY = ['weekly-metrics-summary']; // For Throne Room


interface ApplyPunishmentContext {
  previousHistory?: PunishmentHistoryItem[];
  optimisticHistoryId?: string;
  previousSubPoints?: number;
  previousDomPoints?: number;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints: initialSubPoints, domPoints: initialDomPoints } = args;

        const newSubPoints = initialSubPoints - costPoints;
        let finalDomPoints = initialDomPoints;

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
                finalDomPoints = currentPartnerDomPoints + domEarn;
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

        // Get the current user to determine whose points to update in cache
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error("No authenticated user found");

        // Update the appropriate points in the cache based on who the current user is
        if (currentUser.id === profileId) {
            // Current user is the submissive who got punished
            console.log("Updating points for submissive user (own profile):", newSubPoints, initialDomPoints);
            await updateProfilePoints(newSubPoints, initialDomPoints);
        } else if (userProfile?.linked_partner_id && currentUser.id === userProfile.linked_partner_id) {
            // Current user is the dominant partner who applied the punishment
            console.log("Updating points for dominant user (own profile):", initialSubPoints, finalDomPoints);
            await updateProfilePoints(initialSubPoints, finalDomPoints);
        }
    },
    onMutate: async (args) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      
      // Store previous values
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);
      
      // Get current points values for reverting if needed
      const profilePointsData = queryClient.getQueryData<{points: number, dom_points: number}>(PROFILE_POINTS_QUERY_KEY);
      const previousSubPoints = profilePointsData?.points ?? args.subPoints;
      const previousDomPoints = profilePointsData?.dom_points ?? args.domPoints;
      
      // Create an optimistic history entry
      const optimisticHistoryId = uuidv4();
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: optimisticHistoryId,
        punishment_id: args.id, 
        applied_date: new Date().toISOString(),
        points_deducted: args.costPoints,
        day_of_week: new Date().getDay(), 
      };
      
      // Add optimistic history entry
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );

      // Apply optimistic update for points
      // We'll determine if we're the sub or dom by checking the profileId against the current user
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id === args.profileId) {
          // Current user is the submissive - update their points
          const newSubPoints = args.subPoints - args.costPoints;
          console.log("Optimistically updating submissive points:", newSubPoints, args.domPoints);
          updateProfilePoints(newSubPoints, args.domPoints);
        } else {
          // Current user might be the dom - we'll update dom points
          // This assumes the current user is the dom partner when they're not the sub
          const newDomPoints = args.domPoints + args.domEarn;
          console.log("Optimistically updating dom points:", args.subPoints, newDomPoints);
          updateProfilePoints(args.subPoints, newDomPoints);
        }
      });
      
      return { 
        previousHistory, 
        optimisticHistoryId,
        previousSubPoints,
        previousDomPoints
      };
    },
    onError: (error, _args, context) => {
      // Revert optimistic updates
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      
      // Revert points to previous values
      if (context?.previousSubPoints !== undefined && context?.previousDomPoints !== undefined) {
        updateProfilePoints(context.previousSubPoints, context.previousDomPoints);
      }
      
      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async () => {
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: () => {
      // Invalidate and refetch all affected queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    }
  });
};
