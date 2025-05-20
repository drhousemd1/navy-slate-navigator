import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { PunishmentData } from "@/contexts/punishments/types";
import { WEEKLY_METRICS_QUERY_KEY } from "@/data/queries/metrics/useWeeklyMetrics";
import { MONTHLY_METRICS_QUERY_KEY } from "@/data/queries/metrics/useMonthlyMetrics";
import { updateProfilePoints } from "@/data/sync/updateProfilePoints";
import { ProfilePointsData, PROFILE_POINTS_QUERY_KEY } from "@/data/points/usePointsManager";

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
  previousProfile?: ProfilePoints;
  previousProfilePoints?: ProfilePointsData;
}

export const useRedeemPunishment = () => {
  const queryClient = useQueryClient();
  const PUNISHMENTS_QUERY_KEY = ['punishments'];
  const PROFILE_QUERY_KEY = ['profile'];
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
      // Submissive's DOM points do not change from domEarn in this transaction.
      // domEarn is for the dominant partner, which this hook doesn't directly handle.
      const actualNewDomPoints = currentDomPoints; 

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          points: actualNewSubPoints,
          dom_points: actualNewDomPoints, // Use submissive's unchanged DOM points
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);
      if (profileUpdateError) throw profileUpdateError;
      
      // Update points in cache using the central updateProfilePoints function
      // This should be called for the user whose points actually changed and are being displayed.
      // Assuming profileId is the logged-in user or the user whose points we want to reflect.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === profileId) {
          console.log("Using updateProfilePoints for submissive:", actualNewSubPoints, actualNewDomPoints);
          await updateProfilePoints(actualNewSubPoints, actualNewDomPoints);
        }
        // If there's a linked dominant partner, their points (domEarn) need to be updated separately.
        // This hook currently doesn't do that. `useApplyPunishment` is more suited for that.
      } catch (err) {
        console.error("Error updating points in cache for submissive:", err);
      }

      return {
        success: true,
        punishmentId: id,
        newSubPoints: actualNewSubPoints, // Return submissive's actual new points
        newDomPoints: actualNewDomPoints, // Return submissive's actual (unchanged) dom points
      };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });

      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      const previousProfile = queryClient.getQueryData<ProfilePoints>(PROFILE_QUERY_KEY);
      const previousProfilePoints = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY);

      if (previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (oldPunishments = []) =>
          oldPunishments.map(p =>
            p.id === variables.id ? { ...p, dom_supply: Math.max(0, p.dom_supply - 1) } : p
          )
        );
      }
      
      const optimisticNewSubPoints = variables.currentSubPoints - variables.costPoints;
      // Submissive's DOM points for optimistic update should be their current DOM points.
      const optimisticNewDomPoints = variables.currentDomPoints; 
      
      // Update for usePointsManager
      queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, {
        points: optimisticNewSubPoints,
        dom_points: optimisticNewDomPoints 
      });
      
      // Update for RewardsContext (legacy)
      queryClient.setQueryData(["rewards", "points"], optimisticNewSubPoints);
      queryClient.setQueryData(["rewards", "dom_points"], optimisticNewDomPoints); 
      
      if (previousProfile) {
         queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, (oldProfile = {}) => ({
          ...oldProfile,
          points: optimisticNewSubPoints,
          dom_points: optimisticNewDomPoints,
        }));
      } else { 
        queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, {
            points: optimisticNewSubPoints,
            dom_points: optimisticNewDomPoints,
        });
      }

      return { previousPunishments, previousProfile, previousProfilePoints };
    },
    onSuccess: (data, variables) => { // data now contains submissive's correct newSubPoints and newDomPoints
      toast({
        title: "Punishment Applied",
        description: `${variables.punishmentTitle || 'The punishment'} has been successfully applied.`,
      });
      
      // updateProfilePoints is called with the submissive's correct points.
      // This assumes the current user whose cache is being updated is the submissive.
      // If this hook can be called by a dominant applying to a sub, this needs more context.
      // For now, this makes the submissive's points correct.
      try {
         // The mutationFn already calls updateProfilePoints if user.id === profileId.
         // Calling it again here might be redundant unless specifically for a different user
         // or if the mutationFn's call might fail silently.
         // Given the current structure, let's ensure it's robustly updated.
         // The `data` object contains the submissive's final point state.
        updateProfilePoints(data.newSubPoints, data.newDomPoints);
        console.log("useRedeemPunishment onSuccess: updated profile points with", data.newSubPoints, data.newDomPoints);
      } catch (err) {
        console.error("Error updating points after success in useRedeemPunishment:", err);
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, context.previousProfile);
      }
      if (context?.previousProfilePoints) {
        queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, context.previousProfilePoints);
        // Also restore legacy keys
        const points = context.previousProfilePoints.points;
        const domPoints = context.previousProfilePoints.dom_points;
        queryClient.setQueryData(["rewards", "points"], points);
        queryClient.setQueryData(["rewards", "dom_points"], domPoints);
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
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points"] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points"] });
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
