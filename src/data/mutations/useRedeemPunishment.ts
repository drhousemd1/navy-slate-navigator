
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
  dominantId?: string; // Added to track the dominant partner for invalidation
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
  dominantId?: string; // Track dominant partner for cache restoration if needed
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
      let dominantId: string | null = null;

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

      // 3. Find dominant partner if exists
      const { data: submissiveProfile, error: profileLookupError } = await supabase
        .from("profiles")
        .select("linked_partner_id")
        .eq("id", profileId)
        .single();
        
      if (profileLookupError) throw profileLookupError;
      
      // If there's a linked partner (dominant), update their DOM points
      if (submissiveProfile?.linked_partner_id) {
        dominantId = submissiveProfile.linked_partner_id;
        
        // Get current dominant's points
        const { data: dominantProfile, error: dominantFetchError } = await supabase
          .from("profiles")
          .select("dom_points, points")
          .eq("id", dominantId)
          .single();
          
        if (dominantFetchError) throw dominantFetchError;
        
        const currentDominantDomPoints = dominantProfile?.dom_points || 0;
        const newDominantDomPoints = currentDominantDomPoints + domEarn;
        
        // Update dominant's profile
        const { error: dominantUpdateError } = await supabase
          .from("profiles")
          .update({ 
            dom_points: newDominantDomPoints, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", dominantId);
          
        if (dominantUpdateError) throw dominantUpdateError;
        
        // Update cache for dominant partner
        try {
          console.log("Updating dominant points in cache:", dominantId, dominantProfile.points, newDominantDomPoints);
          await updateProfilePoints(dominantId, dominantProfile.points, newDominantDomPoints);
        } catch (err) {
          console.error("Error updating dominant points in cache:", err);
        }
      }

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
        dominantId: dominantId || undefined
      };
    },
    onMutate: async (variables) => {
      const userProfilePointsKey = getProfilePointsQueryKey(variables.profileId);

      // Find dominant partner ID for optimistic update if possible
      let dominantId: string | undefined;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("linked_partner_id")
          .eq("id", variables.profileId)
          .single();
        if (data?.linked_partner_id) {
          dominantId = data.linked_partner_id;
        }
      } catch (e) {
        console.warn("Could not get dominant partner ID for optimistic update:", e);
      }

      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: userProfilePointsKey });
      // Also cancel queries for dominant if we found their ID
      if (dominantId) {
        await queryClient.cancelQueries({ queryKey: getProfilePointsQueryKey(dominantId) });
      }
      // Cancel base points key as well to prevent stale data
      await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });

      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      const previousProfile = queryClient.getQueryData<ProfilePoints>(PROFILE_QUERY_KEY);
      const previousProfilePoints = queryClient.getQueryData<ProfilePointsData>(userProfilePointsKey);

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
      
      // Update legacy keys for submissive
      queryClient.setQueryData(["rewards", "points", variables.profileId], optimisticNewSubPoints);
      queryClient.setQueryData(["rewards", "dom_points", variables.profileId], optimisticNewDomPoints); 
      
      // Update base key for better consistency when switching pages
      queryClient.setQueryData([PROFILE_POINTS_QUERY_KEY_BASE], {
        points: optimisticNewSubPoints,
        dom_points: optimisticNewDomPoints
      });
      
      // If dominant partner ID is known, optimistically update their points too
      if (dominantId) {
        const dominantPointsKey = getProfilePointsQueryKey(dominantId);
        const currentDominantPoints = queryClient.getQueryData<ProfilePointsData>(dominantPointsKey);
        
        if (currentDominantPoints) {
          const newDomPoints = (currentDominantPoints.dom_points || 0) + variables.domEarn;
          
          queryClient.setQueryData<ProfilePointsData>(dominantPointsKey, {
            ...currentDominantPoints,
            dom_points: newDomPoints
          });
          
          // Update legacy keys for dominant
          queryClient.setQueryData(["rewards", "dom_points", dominantId], newDomPoints);
        }
      }

      return { previousPunishments, previousProfile, previousProfilePoints, dominantId };
    },
    onSuccess: async (data, variables) => { 
      toast({
        title: "Punishment Applied",
        description: `${variables.punishmentTitle || 'The punishment'} has been successfully applied.`,
      });
      
      // Force immediate update for submissive
      try {
        console.log("useRedeemPunishment onSuccess: ensuring profile points update for submissive:", variables.profileId);
        await updateProfilePoints(variables.profileId, data.newSubPoints, data.newDomPoints);
        
        // Also force update for dominant if they exist
        if (data.dominantId) {
          const { data: dominantData } = await supabase
            .from("profiles")
            .select("points, dom_points")
            .eq("id", data.dominantId)
            .single();
            
          if (dominantData) {
            console.log("Ensuring dominant points are updated:", data.dominantId, dominantData.points, dominantData.dom_points);
            await updateProfilePoints(data.dominantId, dominantData.points, dominantData.dom_points);
          }
        }
        
        // Force refresh all profiles cache
        queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      } catch (err) {
        console.error("Error updating points after success:", err);
      }
    },
    onError: (error, variables, context) => {
      const userProfilePointsKey = getProfilePointsQueryKey(variables.profileId);
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, context.previousProfile);
      }
      if (context?.previousProfilePoints) {
        queryClient.setQueryData<ProfilePointsData>(userProfilePointsKey, context.previousProfilePoints);
        queryClient.setQueryData(["rewards", "points", variables.profileId], context.previousProfilePoints.points);
        queryClient.setQueryData(["rewards", "dom_points", variables.profileId], context.previousProfilePoints.dom_points);
      }
      
      // Also rollback dominant partner's points if we updated them optimistically
      if (context?.dominantId) {
        queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(context.dominantId) });
        queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", context.dominantId] });
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
      // Comprehensive invalidation to ensure UI is fresh
      // For submissive
      queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(variables.profileId) });
      queryClient.invalidateQueries({ queryKey: ["rewards", "points", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", variables.profileId] });
      
      // For dominant partner if successful
      if (_data?.dominantId) {
        queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(_data.dominantId) });
        queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", _data.dominantId] });
      }
      
      // Global invalidation to ensure all profiles and related data are refreshed
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      // Specific punishment and metrics
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['punishments', variables.id] });
      }
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    },
  });
};
