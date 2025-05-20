
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js'; // Ensure User type is imported
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
const PROFILE_QUERY_KEY = ['profile']; // General profile key

interface ApplyPunishmentContext {
  previousHistory?: PunishmentHistoryItem[];
  optimisticHistoryId?: string;
  previousProfilePointsForCurrentUser?: ProfilePointsData; // For the user initiating the action (could be admin or sub)
  previousProfilePointsForSubmissive?: ProfilePointsData; // Specifically for the user being punished
  previousDominantProfilePoints?: ProfilePointsData;
  dominantId?: string;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        console.log("Applying punishment with args:", args);
        const { 
          id: punishmentId, 
          costPoints, 
          domEarn, 
          profileId: submissiveProfileId, // ID of the user being punished
          subPoints: initialSubPoints, 
          domPoints: initialSubDomPoints // Submissive's initial DOM points
        } = args;

        // Fetch current authenticated user to determine if they are submissive or dominant
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error("User not authenticated for applying punishment.");

        const newSubPointsForSubmissive = initialSubPoints - costPoints;
        let finalPartnerDomPoints = 0; 
        let dominantPartnerId: string | null = null;

        // 1. Update submissive profile (deduct points)
        console.log(`Updating submissive (${submissiveProfileId}) points from ${initialSubPoints} to ${newSubPointsForSubmissive}`);
        const { error: subProfileError } = await supabase
            .from('profiles')
            .update({ points: newSubPointsForSubmissive, updated_at: new Date().toISOString() }) 
            .eq('id', submissiveProfileId);
        if (subProfileError) {
            console.error("Failed to update submissive profile:", subProfileError);
            throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);
        }

        // 2. Find dominant partner of the submissive
        const { data: submissiveUserProfileData, error: submissiveUserError } = await supabase
            .from('profiles')
            .select('linked_partner_id')
            .eq('id', submissiveProfileId)
            .single();

        if (submissiveUserError) {
            console.error("Failed to fetch submissive user profile for partner link:", submissiveUserError);
            throw new Error(`Failed to fetch submissive user profile: ${submissiveUserError.message}`);
        }

        // 3. Update dominant partner if exists
        if (submissiveUserProfileData?.linked_partner_id) {
            dominantPartnerId = submissiveUserProfileData.linked_partner_id;
            console.log(`Submissive (${submissiveProfileId}) linked to dominant (${dominantPartnerId}). Awarding ${domEarn} DOM points.`);
            const { data: partnerProfile, error: partnerProfileError } = await supabase
                .from('profiles')
                .select('dom_points, points') // Also fetch points for updateProfilePoints
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
                 // Call updateProfilePoints for the dominant partner
                await updateProfilePoints(dominantPartnerId, partnerProfile.points || 0, finalPartnerDomPoints);
            }
        } else {
            console.log(`Submissive (${submissiveProfileId}) has no linked dominant partner.`);
        }

        // 4. Log punishment history
        const historyEntry: Omit<PunishmentHistoryItem, 'id' | 'applied_date'> & { punishment_id: string; applied_date?: string, profile_id?: string } = {
            punishment_id: punishmentId, 
            profile_id: submissiveProfileId, // Log who was punished
            applied_date: new Date().toISOString(),
            points_deducted: costPoints,
            day_of_week: new Date().getDay(), 
        };
        const { data: insertedHistory, error: historyError } = await supabase.from('punishment_history').insert(historyEntry).select().single();
        if (historyError || !insertedHistory) {
            console.error("Failed to record punishment history:", historyError);
            throw new Error(`Failed to record punishment history: ${historyError?.message || 'No data returned'}`);
        }

        // 5. Update caches using updateProfilePoints for the submissive
        console.log(`Calling updateProfilePoints for submissive (${submissiveProfileId}): points=${newSubPointsForSubmissive}, dom_points=${initialSubDomPoints}`);
        await updateProfilePoints(submissiveProfileId, newSubPointsForSubmissive, initialSubDomPoints);
        
        // Note: updateProfilePoints for dominant is called within block 3 if partner exists
    },
    onMutate: async (args: ApplyPunishmentArgs) => {
      const { profileId: submissiveProfileId, domEarn } = args;
      const currentAuthUser = (await supabase.auth.getUser()).data.user;
      const currentAuthUserKey = getProfilePointsQueryKey(currentAuthUser?.id); 
      const submissiveUserKey = getProfilePointsQueryKey(submissiveProfileId);
      
      let dominantId: string | undefined;
      let previousDominantProfilePoints: ProfilePointsData | undefined;
      let previousProfilePointsForSubmissive: ProfilePointsData | undefined;

      try {
        const { data: subProfileData } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', submissiveProfileId)
          .single();
        if (subProfileData?.linked_partner_id) {
          dominantId = subProfileData.linked_partner_id;
        }
      } catch (err) {
        console.warn("Could not get dominant partner ID for optimistic update:", err);
      }

      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: submissiveUserKey });
      if (currentAuthUser?.id && currentAuthUser.id !== submissiveProfileId) {
        await queryClient.cancelQueries({ queryKey: currentAuthUserKey });
      }
      if (dominantId) {
        await queryClient.cancelQueries({ queryKey: getProfilePointsQueryKey(dominantId) });
      }
      await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });

      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);
      const previousProfilePointsForCurrentUser = currentAuthUser ? queryClient.getQueryData<ProfilePointsData>(currentAuthUserKey) : undefined;
      previousProfilePointsForSubmissive = queryClient.getQueryData<ProfilePointsData>(submissiveUserKey);
      if (dominantId) {
        previousDominantProfilePoints = queryClient.getQueryData<ProfilePointsData>(getProfilePointsQueryKey(dominantId));
      }
      
      const optimisticHistoryId = uuidv4();
      const optimisticHistoryEntry: PunishmentHistoryItem & { profile_id?: string } = {
        id: optimisticHistoryId,
        punishment_id: args.id, 
        profile_id: submissiveProfileId,
        applied_date: new Date().toISOString(),
        points_deducted: args.costPoints,
        day_of_week: new Date().getDay(), 
      };
      
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );

      // Optimistic update for submissive
      const newSubmissivePoints = (previousProfilePointsForSubmissive?.points ?? args.subPoints) - args.costPoints;
      queryClient.setQueryData<ProfilePointsData>(submissiveUserKey, {
        points: newSubmissivePoints,
        dom_points: previousProfilePointsForSubmissive?.dom_points ?? args.domPoints,
      });
      queryClient.setQueryData(["rewards", "points", submissiveProfileId], newSubmissivePoints);

      // If current user is submissive, update their "current user" cache too
      if (currentAuthUser && currentAuthUser.id === submissiveProfileId) {
        queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, {
            points: newSubmissivePoints,
            dom_points: previousProfilePointsForCurrentUser?.dom_points ?? args.domPoints,
        });
         queryClient.setQueryData([PROFILE_POINTS_QUERY_KEY_BASE], {
            points: newSubmissivePoints,
            dom_points: previousProfilePointsForCurrentUser?.dom_points ?? args.domPoints,
        });
      }

      // Optimistic update for dominant
      if (dominantId) {
        const newDominantDomPoints = (previousDominantProfilePoints?.dom_points ?? 0) + domEarn;
        queryClient.setQueryData<ProfilePointsData>(getProfilePointsQueryKey(dominantId), {
          points: previousDominantProfilePoints?.points ?? 0,
          dom_points: newDominantDomPoints,
        });
        queryClient.setQueryData(["rewards", "dom_points", dominantId], newDominantDomPoints);

        // If current user is dominant, update their "current user" and base cache
        if (currentAuthUser && currentAuthUser.id === dominantId) {
           queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, {
                points: previousProfilePointsForCurrentUser?.points ?? 0,
                dom_points: newDominantDomPoints,
            });
           queryClient.setQueryData([PROFILE_POINTS_QUERY_KEY_BASE], {
                points: previousProfilePointsForCurrentUser?.points ?? 0,
                dom_points: newDominantDomPoints,
            });
        }
      }
      
      return { 
        previousHistory, 
        optimisticHistoryId, 
        previousProfilePointsForCurrentUser,
        previousProfilePointsForSubmissive,
        previousDominantProfilePoints,
        dominantId
      };
    },
    onSuccess: async (_data, args) => { 
      toast({ title: 'Punishment applied successfully!' });
      
      // Invalidate queries to refetch fresh data from server
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      
      // Invalidate points for submissive
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(args.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", args.profileId] }); // Sub's own dom points

      // Invalidate points for dominant partner if one was involved
      const { data: subProfile } = await supabase.from('profiles').select('linked_partner_id').eq('id', args.profileId).single();
      if (subProfile?.linked_partner_id) {
        const partnerId = subProfile.linked_partner_id;
        queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(partnerId) });
        queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", partnerId] });
        queryClient.invalidateQueries({ queryKey: ["rewards", "points", partnerId] }); // Dom's own sub points
      }
      
      // Invalidate current authenticated user's points if they are not the submissive or dominant (e.g. admin)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.id !== args.profileId && currentUser.id !== subProfile?.linked_partner_id) {
          queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(currentUser.id) });
      }

      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }); // General profile
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    },
    onError: async (error, args, context) => {
      console.error("Error in useApplyPunishment onError:", error.message, context);
      const submissiveProfileId = args.profileId;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentAuthUserKey = getProfilePointsQueryKey(currentUser?.id);
      const submissiveUserKey = getProfilePointsQueryKey(submissiveProfileId);

      // Rollback optimistic updates
      if (context?.previousHistory) {
        queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      if (context?.previousProfilePointsForCurrentUser && currentUser) {
         queryClient.setQueryData(currentAuthUserKey, context.previousProfilePointsForCurrentUser);
      }
      if (context?.previousProfilePointsForSubmissive) {
        queryClient.setQueryData(submissiveUserKey, context.previousProfilePointsForSubmissive);
        queryClient.setQueryData(["rewards", "points", submissiveProfileId], context.previousProfilePointsForSubmissive.points);
      }
      if (context?.dominantId && context?.previousDominantProfilePoints) {
        const dominantKey = getProfilePointsQueryKey(context.dominantId);
        queryClient.setQueryData(dominantKey, context.previousDominantProfilePoints);
        queryClient.setQueryData(["rewards", "dom_points", context.dominantId], context.previousDominantProfilePoints.dom_points);
      }
      
      // If current user's base points were changed optimistically, roll them back too.
      // This requires knowing what the base points were before this specific mutation.
      // A more robust way is to invalidate [PROFILE_POINTS_QUERY_KEY_BASE] and let it refetch.
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });

      toast({ title: 'Error applying punishment', description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    },
    onSettled: async (_data, _error, args) => {
      // Final invalidations to ensure everything is fresh
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(args.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", args.profileId] });

      try {
        const { data: subProfile } = await supabase.from('profiles').select('linked_partner_id').eq('id', args.profileId).single();
        if (subProfile?.linked_partner_id) {
          const partnerId = subProfile.linked_partner_id;
          queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(partnerId) });
          queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", partnerId] });
          queryClient.invalidateQueries({ queryKey: ["rewards", "points", partnerId] });
        }
      } catch(e) { console.error("Error fetching partner for onSettled invalidation:", e); }
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
       if (currentUser) {
          queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(currentUser.id) });
      }

      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    },
  });
};
