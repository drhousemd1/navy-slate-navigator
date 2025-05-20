import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { PunishmentData } from "@/contexts/punishments/types";
import { WEEKLY_METRICS_QUERY_KEY } from "@/data/queries/metrics/useWeeklyMetrics";
import { MONTHLY_METRICS_QUERY_KEY } from "@/data/queries/metrics/useMonthlyMetrics";
import { updateProfilePoints } from "@/data/sync/updateProfilePoints";
import { ProfilePointsData, getProfilePointsQueryKey, PROFILE_POINTS_QUERY_KEY_BASE } from "@/data/points/usePointsManager";

// Helper function to generate ISO week string (YYYY-Wxx format)
// Consider moving to a shared util file.
function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // 1–7 (Mon–Sun)
  d.setUTCDate(d.getUTCDate() + 4 - day); // to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

export interface RedeemPunishmentVariables {
  id: string; // Punishment ID
  currentDomSupply: number; // Current dom_supply of the punishment
  costPoints: number; // Cost in sub points
  domEarn: number; // Dom points earned by dominant
  profileId: string; // User's profile ID (submissive's ID)
  currentSubPoints: number; // Current sub points of the user (submissive)
  currentDomPoints: number; // Current dom points of the user (submissive)
  punishmentTitle?: string; // Optional: for toast messages
}

interface RedeemPunishmentSuccessData {
  success: boolean;
  punishmentId: string;
  newSubPoints: number; // Submissive's new sub points
  newDomPoints: number; // Submissive's new dom points (should be unchanged by this action)
}

interface ProfilePoints {
  points?: number;
  dom_points?: number;
  [key: string]: any; // Allow other profile fields
}

interface RedeemPunishmentOptimisticContext {
  previousPunishments?: PunishmentData[];
  previousProfile?: ProfilePoints; // This refers to the general profile object, likely for current user
  previousProfilePoints?: ProfilePointsData; // This refers to points data for variables.profileId
}

export const useRedeemPunishment = () => {
  const queryClient = useQueryClient();
  const PUNISHMENTS_QUERY_KEY = ['punishments'];
  const PROFILE_QUERY_KEY = ['profile']; // Likely for the current authenticated user's full profile
  const WEEKLY_METRICS_SUMMARY_QUERY_KEY = ['weekly-metrics-summary'];

  return useMutation<
    RedeemPunishmentSuccessData,
    Error,
    RedeemPunishmentVariables,
    RedeemPunishmentOptimisticContext
  >({
    mutationFn: async ({
      id,
      currentDomSupply,
      costPoints,
      domEarn, // This is for the dominant partner, not the submissive
      profileId, // Submissive's ID
      currentSubPoints, // Submissive's current sub points
      currentDomPoints, // Submissive's current dom points
    }) => {
      console.log("Redeeming punishment:", { id, costPoints, domEarn, profileId, currentSubPoints, currentDomPoints });
      
      if (currentDomSupply <= 0) {
        toast({
          title: "Punishment Unavailable",
          description: "This punishment currently has no supply left.",
          variant: "destructive",
        });
        throw new Error("Punishment has no supply left");
      }

      const today = new Date();
      const dayOfWeek = today.getDay(); 
      const weekNumber = getISOWeekString(today);

      // 1. Log usage history
      const { error: historyError } = await supabase.from("punishment_history").insert([
        {
          punishment_id: id,
          profile_id: profileId, 
          day_of_week: dayOfWeek,
          week_number: weekNumber,
          points_deducted: costPoints,
          applied_date: today.toISOString(),
        }
      ]);
      if (historyError) throw historyError;

      // 2. Update punishment's dom_supply (decrementing)
      const { error: punishmentUpdateError } = await supabase
        .from("punishments")
        .update({ dom_supply: Math.max(0, currentDomSupply - 1), updated_at: new Date().toISOString() })
        .eq("id", id);
      if (punishmentUpdateError) throw punishmentUpdateError;

      // 3. Update submissive's profile totals
      const actualNewSubPoints = currentSubPoints - costPoints;
      const actualNewDomPoints = currentDomPoints; 

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          points: actualNewSubPoints,
          dom_points: actualNewDomPoints,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);
      if (profileUpdateError) throw profileUpdateError;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        // user.id here is the current authenticated user. profileId is the submissive whose points changed.
        // updateProfilePoints needs the ID of the user whose points are being updated.
        console.log("Using updateProfilePoints for submissive (profileId):", profileId, "with points:", actualNewSubPoints, actualNewDomPoints);
        await updateProfilePoints(profileId, actualNewSubPoints, actualNewDomPoints);
        
      } catch (err) {
        console.error("Error updating points in cache for submissive:", err);
      }

      return {
        success: true,
        punishmentId: id,
        newSubPoints: actualNewSubPoints,
        newDomPoints: actualNewDomPoints,
      };
    },
    onMutate: async (variables) => {
      const userProfilePointsKey = getProfilePointsQueryKey(variables.profileId);

      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY }); // Assuming this is for current user
      await queryClient.cancelQueries({ queryKey: userProfilePointsKey });

      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      const previousProfile = queryClient.getQueryData<ProfilePoints>(PROFILE_QUERY_KEY); // current user's full profile
      const previousProfilePoints = queryClient.getQueryData<ProfilePointsData>(userProfilePointsKey); // submissive's points

      if (previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (oldPunishments = []) =>
          oldPunishments.map(p =>
            p.id === variables.id ? { ...p, dom_supply: Math.max(0, p.dom_supply - 1) } : p
          )
        );
      }
      
      const optimisticNewSubPoints = variables.currentSubPoints - variables.costPoints;
      const optimisticNewDomPoints = variables.currentDomPoints; 
      
      // Update for usePointsManager (submissive's points)
      queryClient.setQueryData<ProfilePointsData>(userProfilePointsKey, {
        points: optimisticNewSubPoints,
        dom_points: optimisticNewDomPoints 
      });
      
      // Update for RewardsContext (legacy) - these are specific to the submissive
      // Assuming updateProfilePoints handles the localForage and queryClient for these with user ID
      // So, optimistic update here should also be user-specific if these keys are now user-specific in query cache.
      // updateProfilePoints now does: queryClient.setQueryData(["rewards", "points", userId], points);
      // So optimistic updates should mirror this:
      queryClient.setQueryData(["rewards", "points", variables.profileId], optimisticNewSubPoints);
      queryClient.setQueryData(["rewards", "dom_points", variables.profileId], optimisticNewDomPoints); 
      
      // If PROFILE_QUERY_KEY refers to the submissive's full profile
      // This logic might need to check if current user is the submissive
      if (previousProfile) { // This optimistic update is for PROFILE_QUERY_KEY, which might be the current user
         queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, (oldProfile = {}) => ({
          ...oldProfile,
          // Only update if current user IS the submissive, otherwise this is wrong.
          // This part is potentially problematic if PROFILE_QUERY_KEY isn't for variables.profileId
          // For now, let's assume it affects the current user's view of their own points IF they are the submissive
          // This part needs careful review based on how PROFILE_QUERY_KEY is used elsewhere.
          // To be safe, only update points if profileId matches current user.
          points: oldProfile.id === variables.profileId ? optimisticNewSubPoints : oldProfile.points,
          dom_points: oldProfile.id === variables.profileId ? optimisticNewDomPoints : oldProfile.dom_points,
        }));
      } else { 
        // This case also needs to be conditional on whose profile PROFILE_QUERY_KEY refers to.
        // queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, {
        //     points: optimisticNewSubPoints,
        //     dom_points: optimisticNewDomPoints,
        // });
      }

      return { previousPunishments, previousProfile, previousProfilePoints };
    },
    onSuccess: async (data, variables) => { 
      toast({
        title: "Punishment Applied",
        description: `${variables.punishmentTitle || 'The punishment'} has been successfully applied.`,
      });
      
      try {
        // updateProfilePoints was already called in mutationFn for variables.profileId
        // Calling it again here might be redundant but ensures the final state from DB is in cache.
        console.log("useRedeemPunishment onSuccess: ensuring profile points update for submissive (profileId):", variables.profileId, "with points:", data.newSubPoints, data.newDomPoints);
        await updateProfilePoints(variables.profileId, data.newSubPoints, data.newDomPoints);
      } catch (err) {
        console.error("Error updating points after success in useRedeemPunishment:", err);
      }
    },
    onError: (error, variables, context) => {
      const userProfilePointsKey = getProfilePointsQueryKey(variables.profileId);
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
      if (context?.previousProfile) { // Rollback current user's general profile if it was optimistically changed
        queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, context.previousProfile);
      }
      if (context?.previousProfilePoints) { // Rollback submissive's points
        queryClient.setQueryData<ProfilePointsData>(userProfilePointsKey, context.previousProfilePoints);
        // Also restore legacy keys for the submissive
        queryClient.setQueryData(["rewards", "points", variables.profileId], context.previousProfilePoints.points);
        queryClient.setQueryData(["rewards", "dom_points", variables.profileId], context.previousProfilePoints.dom_points);
      }
      
      console.error('Error applying punishment via useRedeemPunishment:', error);
      if (error.message !== "Punishment has no supply left") {
        toast({
          title: "Failed to Apply Punishment",
          description: error.message || "There was a problem applying this punishment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(variables.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", variables.profileId] });
      // Invalidate specific user profile if PROFILE_QUERY_KEY is like ['profile', userId]
      // For now, assuming PROFILE_QUERY_KEY is for current user or a list, so broader invalidation is okay.
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }); 
      
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['punishments', variables.id] });
      }
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    },
  });
};
