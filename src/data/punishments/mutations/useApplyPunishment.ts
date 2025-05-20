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
  previousProfilePointsForCurrentUser?: ProfilePointsData;
  previousDominantProfilePoints?: ProfilePointsData;
  dominantId?: string;
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

            // 1. Update submissive profile (deduct points)
            const { error: subProfileError } = await supabase
                .from('profiles')
                .update({ points: newSubPoints, updated_at: new Date().toISOString() }) 
                .eq('id', profileId);
            if (subProfileError) {
                console.error("Failed to update submissive profile:", subProfileError);
                throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);
            }

            // 2. Find dominant partner
            const { data: submissiveUserProfile, error: submissiveUserError } = await supabase
                .from('profiles')
                .select('linked_partner_id')
                .eq('id', profileId)
                .single();

            if (submissiveUserError) {
                console.error("Failed to fetch submissive user profile:", submissiveUserError);
                throw new Error(`Failed to fetch submissive user profile: ${submissiveUserError.message}`);
            }

            // 3. Update dominant partner if exists
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

            // 4. Log punishment history
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

            // 5. Update caches using updateProfilePoints
            console.log("Updating submissive points in mutationFn:", profileId, newSubPoints, initialProfileDomPoints);
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
            
            // Force immediate global cache refresh to ensure headers display correct values
            queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
        } catch (error) {
            console.error("Error in useApplyPunishment mutationFn:", error);
            throw error;
        }
    },
    onMutate: async (args: ApplyPunishmentArgs) => {
      // Get query keys for both current user and submissive (if different)
      const currentAuthUserKey = getProfilePointsQueryKey(); 
      const submissiveUserKey = getProfilePointsQueryKey(args.profileId);
      let dominantId: string | undefined;
      let previousDominantProfilePoints: ProfilePointsData | undefined;

      // Find dominant partner ID for optimistic updates
      try {
        const { data } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', args.profileId)
          .single();
          
        if (data?.linked_partner_id) {
          dominantId = data.linked_partner_id;
          const dominantKey = getProfilePointsQueryKey(dominantId);
          await queryClient.cancelQueries({ queryKey: dominantKey });
          previousDominantProfilePoints = queryClient.getQueryData<ProfilePointsData>(dominantKey);
        }
      } catch (err) {
        console.error("Error finding dominant partner for optimistic update:", err);
      }

      // Cancel relevant queries
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: submissiveUserKey });
      await queryClient.cancelQueries({ queryKey: currentAuthUserKey });
      await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE]});

      // Store previous state
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);
      const previousProfilePointsForCurrentUser = queryClient.getQueryData<ProfilePointsData>(currentAuthUserKey);

      // Create optimistic history entry
      const optimisticHistoryId = uuidv4();
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: optimisticHistoryId,
        punishment_id: args.id, 
        applied_date: new Date().toISOString(),
        points_deducted: args.costPoints,
        day_of_week: new Date().getDay(), 
      };
      
      // Update history optimistically
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
            // Optimistic update for submissive - always update submissiveUserKey
            queryClient.setQueryData<ProfilePointsData>(submissiveUserKey, (oldData) => {
              return {
                points: (oldData?.points ?? args.subPoints) - args.costPoints,
                dom_points: oldData?.dom_points ?? args.domPoints,
              };
            });
            
            // Update legacy keys for submissive
            queryClient.setQueryData(["rewards", "points", args.profileId], 
              (oldVal?: number) => (oldVal ?? args.subPoints) - args.costPoints);
            
            // If current user is the submissive, also update currentAuthUserKey (if different)
            if (currentUser.id === args.profileId && submissiveUserKey !== currentAuthUserKey) {
              queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, (oldData) => {
                return {
                  points: (oldData?.points ?? args.subPoints) - args.costPoints,
                  dom_points: oldData?.dom_points ?? args.domPoints,
                };
              });
            }
            
            // Update base profile points key for global state
            queryClient.setQueryData<ProfilePointsData>([PROFILE_POINTS_QUERY_KEY_BASE], (oldData) => {
              if (currentUser.id === args.profileId) {
                // Current user is submissive
                return {
                  points: (oldData?.points ?? args.subPoints) - args.costPoints,
                  dom_points: oldData?.dom_points ?? args.domPoints,
                };
              } else if (currentUser.id === dominantId) {
                // Current user is dominant
                return {
                  points: oldData?.points ?? 0,
                  dom_points: (oldData?.dom_points ?? 0) + args.domEarn,
                };
              }
              return oldData || { points: 0, dom_points: 0 };
            });
            
            // If dominant partner exists and was found, optimistically update their points too
            if (dominantId) {
              const dominantKey = getProfilePointsQueryKey(dominantId);
              
              queryClient.setQueryData<ProfilePointsData>(dominantKey, (oldData) => {
                return {
                  points: oldData?.points ?? 0,
                  dom_points: (oldData?.dom_points ?? 0) + args.domEarn,
                };
              });
              
              // Update legacy key for dominant
              queryClient.setQueryData(["rewards", "dom_points", dominantId], 
                (oldVal?: number) => (oldVal ?? 0) + args.domEarn);
                
              // If current user is dominant, also update currentAuthUserKey
              if (currentUser.id === dominantId && dominantKey !== currentAuthUserKey) {
                queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, (oldData) => {
                  return {
                    points: oldData?.points ?? 0,
                    dom_points: (oldData?.dom_points ?? 0) + args.domEarn,
                  };
                });
              }
            }
        }
      } catch (error) {
        console.error("Error in optimistic update:", error);
      }

      return { 
        previousHistory, 
        optimisticHistoryId, 
        previousProfilePointsForCurrentUser,
        previousDominantProfilePoints,
        dominantId
      };
    },
    onError: async (error, _args, context) => {
      console.error("Error in useApplyPunishment onError:", error);
      const currentAuthUserKey = getProfilePointsQueryKey();
      const submissiveUserKey = getProfilePointsQueryKey(_args.profileId);

      // Roll back history
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      
      // Roll back current user's points
      if (context?.previousProfilePointsForCurrentUser) {
        queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, context.previousProfilePointsForCurrentUser);
        
        // Also rollback legacy keys if current user is submissive
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error("Error fetching user in onError for rollback:", authError);
        }
        const user = authData?.user;

        if (user && user.id === _args.profileId) {
          queryClient.setQueryData(["rewards", "points", _args.profileId], context.previousProfilePointsForCurrentUser.points);
          queryClient.setQueryData(["rewards", "dom_points", _args.profileId], context.previousProfilePointsForCurrentUser.dom_points);
        }
      }
      
      // Roll back submissive points if different from current user
      if (submissiveUserKey !== currentAuthUserKey) {
        // It might be better to use previous data from context if available or invalidate
        const submissivePreviousPoints = queryClient.getQueryData<ProfilePointsData>(submissiveUserKey);
        if (submissivePreviousPoints && context?.previousProfilePointsForCurrentUser?.points !== undefined && _args.profileId !== user?.id) {
             // This logic might need refinement based on what's stored in context for non-current-user submissives
        }
        queryClient.invalidateQueries({ queryKey: submissiveUserKey });
        queryClient.invalidateQueries({ queryKey: ["rewards", "points", _args.profileId] });
        queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", _args.profileId] });

      }
      
      // Roll back dominant points
      if (context?.dominantId && context?.previousDominantProfilePoints) {
        const dominantKey = getProfilePointsQueryKey(context.dominantId);
        queryClient.setQueryData<ProfilePointsData>(dominantKey, context.previousDominantProfilePoints);
        queryClient.setQueryData(["rewards", "dom_points", context.dominantId], context.previousDominantProfilePoints.dom_points);
      }

      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
      
      // Force global refresh after error
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
    },
    onSuccess: async (_data, args) => { 
      toast({ title: 'Punishment applied successfully!' });
      
      // Clear any stale data
      await queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      await queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(args.profileId) });
      
      // Find dominant partner and invalidate their cache
      try {
        const { data: subProfile } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', args.profileId)
          .single();
          
        if (subProfile?.linked_partner_id) {
          const partnerId = subProfile.linked_partner_id;
          await queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(partnerId) });
          console.log("Invalidating dominant partner cache:", partnerId);
          
          // Force update of dominant partner points in cache
          const { data: dominantProfile } = await supabase
            .from('profiles')
            .select('points, dom_points')
            .eq('id', partnerId)
            .single();
            
          if (dominantProfile) {
            console.log("Forcing update of dominant points in cache:", partnerId, dominantProfile.points, dominantProfile.dom_points);
            await updateProfilePoints(partnerId, dominantProfile.points, dominantProfile.dom_points);
          }
        }
      } catch (e) {
        console.warn("Could not fetch partner ID or update cache in onSuccess:", e);
      }
    },
    onSettled: async (_data, _error, args) => {
      // Comprehensive invalidation strategy
      
      // 1. Invalidate submissive points
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(args.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["profile", args.profileId]});

      // 2. Find and invalidate dominant partner's cache
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
        }
      } catch (e) {
        console.warn("Could not fetch partner ID in onSettled for invalidation:", e);
      }
      
      // 3. Global invalidation of points and profiles
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      
      // 4. Other punishment-related data
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      
      // 5. Force immediate refresh of headers via updateProfilePoints
      // Get current authenticated user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('points, dom_points')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            console.log("Forcing update of current user points in cache:", user.id, profile.points, profile.dom_points);
            await updateProfilePoints(user.id, profile.points, profile.dom_points);
          }
        }
      } catch (err) {
        console.error("Error refreshing current user points in onSettled:", err);
      }
    }
  });
};
