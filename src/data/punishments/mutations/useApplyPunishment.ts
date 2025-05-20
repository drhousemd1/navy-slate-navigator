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
  previousProfilePointsForPartner?: ProfilePointsData;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
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
                await updateProfilePoints(dominantPartnerId, domPartnerCurrentSubPoints, finalPartnerDomPoints);
            }
        } catch (error) {
            console.error("Error in useApplyPunishment mutationFn:", error);
            throw error;
        }
    },
    onMutate: async (args: ApplyPunishmentArgs) => {
      const currentAuthUserKey = getProfilePointsQueryKey(); // Key for the current authenticated user
      
      // Cancel relevant queries
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: currentAuthUserKey });
      
      // Store previous state
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);
      const previousProfilePointsForCurrentUser = queryClient.getQueryData<ProfilePointsData>(currentAuthUserKey);
      let previousProfilePointsForPartner: ProfilePointsData | undefined;
      
      // Create optimistic update for history
      const optimisticHistoryId = uuidv4();
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: optimisticHistoryId,
        punishment_id: args.id, 
        applied_date: new Date().toISOString(),
        points_deducted: args.costPoints,
        day_of_week: new Date().getDay(), 
      };
      
      // Apply optimistic updates
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );
      
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('linked_partner_id')
                .eq('id', args.profileId) // args.profileId is the submissive's ID
                .single();
            
            // Optimistic update for the current authenticated user
            if (currentUser.id === args.profileId) { // Current user is the submissive
              queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, (oldData) => {
                const currentSubPoints = oldData?.points ?? args.subPoints;
                const currentDomPoints = oldData?.dom_points ?? args.domPoints;
                return {
                  points: currentSubPoints - args.costPoints,
                  dom_points: currentDomPoints, 
                };
              });
              
              // Update legacy keys for current user (submissive)
              queryClient.setQueryData(["rewards", "points", currentUser.id], 
                (oldVal?: number) => (oldVal ?? args.subPoints) - args.costPoints);
              queryClient.setQueryData(["rewards", "dom_points", currentUser.id], 
                (oldVal?: number) => oldVal ?? args.domPoints);
            } 
            
            // Handle partner optimistic updates
            if (profile?.linked_partner_id) {
              const partnerId = profile.linked_partner_id;
              const partnerKey = getProfilePointsQueryKey(partnerId);
              
              // Cancel partner queries
              await queryClient.cancelQueries({ queryKey: partnerKey });
              
              // Store partner's previous state
              previousProfilePointsForPartner = queryClient.getQueryData<ProfilePointsData>(partnerKey);
              
              // If current user is the dominant partner
              if (currentUser.id === partnerId) {
                queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, (oldData) => {
                  const currentDomSubPoints = oldData?.points ?? 0; 
                  const currentDomDomPoints = oldData?.dom_points ?? 0; 
                  return {
                    points: currentDomSubPoints, 
                    dom_points: currentDomDomPoints + args.domEarn, 
                  };
                });
                
                // Update legacy keys for current user (dominant)
                queryClient.setQueryData(["rewards", "dom_points", currentUser.id], 
                  (oldVal?: number) => (oldVal ?? 0) + args.domEarn);
              } 
              // If partner is the dominant (but not current user)
              else if (partnerId) {
                // Update partner's data in cache
                queryClient.setQueryData<ProfilePointsData>(partnerKey, (oldData) => {
                  const partnerSubPoints = oldData?.points ?? 0;
                  const partnerDomPoints = oldData?.dom_points ?? 0;
                  return {
                    points: partnerSubPoints,
                    dom_points: partnerDomPoints + args.domEarn
                  };
                });
                
                // Update legacy keys for partner
                queryClient.setQueryData(["rewards", "dom_points", partnerId], 
                  (oldVal?: number) => (oldVal ?? 0) + args.domEarn);
              }
            }
        }
      } catch (error) {
        console.error("Error in optimistic update (useApplyPunishment):", error);
      }

      return { 
        previousHistory, 
        optimisticHistoryId, 
        previousProfilePointsForCurrentUser,
        previousProfilePointsForPartner
      };
    },
    onError: async (error, _args, context) => {
      console.error("Error in useApplyPunishment onError:", error);
      const currentAuthUserKey = getProfilePointsQueryKey(); 

      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      
      if (context?.previousProfilePointsForCurrentUser) {
        queryClient.setQueryData<ProfilePointsData>(currentAuthUserKey, context.previousProfilePointsForCurrentUser);
        
        const userId = currentAuthUserKey[1]; 
        if (userId && typeof userId === 'string') { // Ensure userId is a string before using it
            queryClient.setQueryData(["rewards", "points", userId], context.previousProfilePointsForCurrentUser.points);
            queryClient.setQueryData(["rewards", "dom_points", userId], context.previousProfilePointsForCurrentUser.dom_points);
        }
      }
      
      try {
        const sessionResult = await supabase.auth.getSession(); // Explicitly await and store result
        const sessionData = sessionResult.data;
        const sessionError = sessionResult.error;

        if (sessionError) {
          console.error("Error fetching session for partner data restoration:", sessionError);
        } else {
          const user = sessionData?.session?.user;
          if (user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('linked_partner_id')
              .eq('id', user.id)
              .single();

            if (profileError) {
              console.error("Error fetching profile for partner data restoration:", profileError);
            } else if (profile?.linked_partner_id && context?.previousProfilePointsForPartner) {
              const partnerId = profile.linked_partner_id;
              const partnerKey = getProfilePointsQueryKey(partnerId);
              queryClient.setQueryData(partnerKey, context.previousProfilePointsForPartner);
              
              queryClient.setQueryData(
                ["rewards", "points", partnerId], 
                context.previousProfilePointsForPartner.points
              );
              queryClient.setQueryData(
                ["rewards", "dom_points", partnerId], 
                context.previousProfilePointsForPartner.dom_points
              );
            }
          }
        }
      } catch (err) {
        console.error("Error restoring partner data in onError:", err);
      }

      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: (_data, args) => { 
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: async (_data, _error, args) => {
      // Invalidate all affected queries to ensure fresh data
      
      // Invalidate for the submissive user
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(args.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", args.profileId] });
      queryClient.invalidateQueries({ queryKey: ["profile", args.profileId]});

      // Find partner ID to invalidate their points as well
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
        // Fallback to broader invalidation
        queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
        queryClient.invalidateQueries({ queryKey: ["rewards"] }); 
        queryClient.invalidateQueries({ queryKey: ["profile"] }); 
      }
      
      // Invalidate metrics and punishment data
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
      
      // We need a manual refetch to ensure the UI updates immediately
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('linked_partner_id')
            .eq('id', user.id)
            .single();
            
          // Force refetch both user and partner data
          queryClient.refetchQueries({ queryKey: getProfilePointsQueryKey(user.id) });
          if (profile?.linked_partner_id) {
            queryClient.refetchQueries({ queryKey: getProfilePointsQueryKey(profile.linked_partner_id) });
          }
        }
      } catch (e) {
        console.warn("Error in final refetch:", e);
      }
    }
  });
};
