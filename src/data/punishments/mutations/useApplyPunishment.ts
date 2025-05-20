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
        console.log('[useApplyPunishment] mutationFn started with args:', args);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error('[useApplyPunishment] Auth session error or no session in mutationFn:', sessionError, session);
          toast({ title: 'Authentication Error', description: 'Your session is invalid. Please log in again.', variant: 'destructive' });
          throw new Error('User session is invalid or expired.');
        }
        console.log('[useApplyPunishment] Session validated in mutationFn. User ID:', session.user.id);

        const { id: punishmentId, costPoints, domEarn, profileId, subPoints: initialSubPoints, domPoints: initialDomPoints } = args;

        // Ensure profileId from args matches the currently authenticated user if this is a self-action
        // This check might be more relevant if punishments could be applied by one user to another.
        // For now, assuming profileId is the current user's.
        if (session.user.id !== profileId) {
            console.warn(`[useApplyPunishment] Mismatch between session user ID (${session.user.id}) and profileId in args (${profileId}). Proceeding, but this might indicate an issue.`);
            // Depending on logic, this could be an error:
            // throw new Error('Session user does not match target profile for punishment application.');
        }


        const newSubPoints = initialSubPoints - costPoints;
        let finalDomPoints = initialDomPoints; 

        console.log(`[useApplyPunishment] Updating submissive (${profileId}) points to: ${newSubPoints}`);
        const { error: subProfileError } = await supabase
            .from('profiles')
            .update({ points: newSubPoints, updated_at: new Date().toISOString() })
            .eq('id', profileId);
        if (subProfileError) {
          console.error('[useApplyPunishment] Error updating submissive profile:', subProfileError);
          throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);
        }

        const { data: userProfile } = await supabase.from('profiles').select('linked_partner_id').eq('id', profileId).single();
        if (userProfile?.linked_partner_id) {
            console.log(`[useApplyPunishment] Submissive has linked partner: ${userProfile.linked_partner_id}. Fetching partner profile.`);
            const { data: partnerProfile, error: partnerProfileError } = await supabase
                .from('profiles')
                .select('dom_points')
                .eq('id', userProfile.linked_partner_id)
                .single();

            if (partnerProfileError) {
              console.error('[useApplyPunishment] Error fetching partner profile:', partnerProfileError);
              throw new Error(`Failed to fetch partner profile: ${partnerProfileError.message}`);
            }
            
            if (partnerProfile) {
                const currentPartnerDomPoints = partnerProfile.dom_points || 0;
                finalDomPoints = currentPartnerDomPoints + domEarn;
                console.log(`[useApplyPunishment] Updating dominant partner (${userProfile.linked_partner_id}) dom_points to: ${finalDomPoints}`);
                const { error: domProfileError } = await supabase
                    .from('profiles')
                    .update({ dom_points: finalDomPoints, updated_at: new Date().toISOString() })
                    .eq('id', userProfile.linked_partner_id);
                if (domProfileError) {
                  console.error('[useApplyPunishment] Error updating dominant profile:', domProfileError);
                  throw new Error(`Failed to update dominant profile: ${domProfileError.message}`);
                }
            }
        } else {
          console.log(`[useApplyPunishment] No linked partner for submissive ${profileId}. Dominant points earn logic might need review if not self-play.`);
        }

        const historyEntry: Omit<PunishmentHistoryItem, 'id' | 'applied_date'> & { punishment_id: string; applied_date?: string; profile_id: string; } = {
            punishment_id: punishmentId, 
            profile_id: profileId, // Ensure profile_id is added
            applied_date: new Date().toISOString(),
            points_deducted: costPoints,
            day_of_week: new Date().getDay(), 
        };
        console.log('[useApplyPunishment] Inserting punishment history entry:', historyEntry);
        const { error: historyError } = await supabase.from('punishment_history').insert(historyEntry).select().single();
        if (historyError) {
          console.error('[useApplyPunishment] Error recording punishment history:', historyError);
          throw new Error(`Failed to record punishment history: ${historyError.message}`);
        }
        console.log('[useApplyPunishment] Punishment history recorded.');

        // Re-fetch current user to ensure we are updating the correct cache entry
        // This is important because the `profileId` in args might not always be the currently logged-in user,
        // especially if an admin applies a punishment to another user.
        // However, `updateProfilePoints` is designed to update the *currently logged-in user's* point display.
        const { data: { user: currentUserForCacheUpdate } } = await supabase.auth.getUser();
        if (currentUserForCacheUpdate) {
            console.log(`[useApplyPunishment] Updating profile points in cache for user ${currentUserForCacheUpdate.id}.`);
            if (currentUserForCacheUpdate.id === profileId) { // Current user is the submissive who got punished
                console.log(`[useApplyPunishment] Cache update for submissive: newSubPoints=${newSubPoints}, initialDomPoints=${initialDomPoints}`);
                await updateProfilePoints(newSubPoints, initialDomPoints); 
            } else if (userProfile?.linked_partner_id && currentUserForCacheUpdate.id === userProfile.linked_partner_id) { // Current user is the dominant partner
                console.log(`[useApplyPunishment] Cache update for dominant partner: initialSubPoints=${initialSubPoints} (sub's points before), finalDomPoints=${finalDomPoints}`);
                 await updateProfilePoints(initialSubPoints, finalDomPoints); 
            } else {
                console.log(`[useApplyPunishment] Logged-in user ${currentUserForCacheUpdate.id} is neither the punished user ${profileId} nor their partner ${userProfile?.linked_partner_id}. Cache for points not directly updated by this mutation for this user.`);
            }
        } else {
            console.warn('[useApplyPunishment] Could not get current user for cache update after punishment application.');
        }
        console.log('[useApplyPunishment] mutationFn completed successfully.');
    },
    onMutate: async (args) => {
      console.log('[useApplyPunishment] onMutate called with args:', args);
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);
      
      const optimisticHistoryId = uuidv4();
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: optimisticHistoryId,
        punishment_id: args.id, 
        // profile_id: args.profileId, // Add if your type requires it
        applied_date: new Date().toISOString(),
        points_deducted: args.costPoints,
        day_of_week: new Date().getDay(), 
      };
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );
      console.log('[useApplyPunishment] Optimistic history update applied.');
      return { previousHistory, optimisticHistoryId };
    },
    onError: (error, _args, context) => {
      console.error('[useApplyPunishment] onError:', error.message, 'Args:', _args);
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
        console.log('[useApplyPunishment] Rolled back optimistic history update.');
      }
      // Avoid duplicate toasts if a more specific one was already shown (e.g., session error)
      if (error.message !== 'User session is invalid or expired.') {
        toast({ title: 'Error Applying Punishment', description: error.message, variant: 'destructive' });
      }
    },
    onSuccess: async (data, variables) => {
      console.log('[useApplyPunishment] onSuccess. Variables:', variables);
      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      
      console.log('[useApplyPunishment] Relevant queries invalidated.');
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: (data, error, variables) => {
      console.log('[useApplyPunishment] onSettled. Error:', error?.message, 'Variables:', variables);
      // It's good practice to invalidate again in onSettled to ensure data consistency
      // regardless of success or failure, especially for shared data.
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY }); 
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      console.log('[useApplyPunishment] Queries re-invalidated in onSettled.');
    }
  });
};
