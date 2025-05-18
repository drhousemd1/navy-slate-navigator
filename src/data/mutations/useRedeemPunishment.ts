
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { PunishmentData } from "@/contexts/punishments/types"; // Assuming this path is correct and type is available

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
  profileId: string; // User's profile ID
  currentSubPoints: number; // Current sub points of the user
  currentDomPoints: number; // Current dom points of the user
  punishmentTitle?: string; // Optional: for toast messages
}

interface RedeemPunishmentSuccessData {
  success: boolean;
  punishmentId: string;
  newSubPoints: number;
  newDomPoints: number;
}

interface ProfilePoints {
  points?: number;
  dom_points?: number;
  [key: string]: any; // Allow other profile fields
}

interface RedeemPunishmentOptimisticContext {
  previousPunishments?: PunishmentData[];
  previousProfile?: ProfilePoints;
}

export const useRedeemPunishment = () => {
  const queryClient = useQueryClient();
  const PUNISHMENTS_QUERY_KEY = ['punishments'];
  const PROFILE_QUERY_KEY = ['profile']; // Assuming 'profile' holds points, dom_points

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
      domEarn,
      profileId,
      currentSubPoints,
      currentDomPoints,
    }) => {
      if (currentDomSupply <= 0) {
        toast({
          title: "Punishment Unavailable",
          description: "This punishment currently has no supply left.",
          variant: "destructive",
        });
        throw new Error("Punishment has no supply left");
      }

      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
      const weekNumber = getISOWeekString(today);

      // 1. Log usage history
      const { error: historyError } = await supabase.from("punishment_history").insert([
        {
          punishment_id: id,
          profile_id: profileId, // It's good practice to log who applied/received
          day_of_week: dayOfWeek,
          week_number: weekNumber,
          points_deducted: costPoints,
          applied_date: today.toISOString(),
          // dom_points_earned: domEarn, // Consider adding if schema supports
        }
      ]);
      if (historyError) throw historyError;

      // 2. Update punishment's dom_supply (decrementing)
      const { error: punishmentUpdateError } = await supabase
        .from("punishments")
        .update({ dom_supply: Math.max(0, currentDomSupply - 1), updated_at: new Date().toISOString() })
        .eq("id", id);
      if (punishmentUpdateError) throw punishmentUpdateError;

      // 3. Update profile totals
      const newSubPoints = currentSubPoints - costPoints;
      const newDomPoints = currentDomPoints + domEarn;
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          points: newSubPoints,
          dom_points: newDomPoints,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);
      if (profileUpdateError) throw profileUpdateError;

      return {
        success: true,
        punishmentId: id,
        newSubPoints,
        newDomPoints,
      };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });

      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      const previousProfile = queryClient.getQueryData<ProfilePoints>(PROFILE_QUERY_KEY);

      // Optimistic update for punishments
      if (previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (oldPunishments = []) =>
          oldPunishments.map(p =>
            p.id === variables.id ? { ...p, dom_supply: Math.max(0, p.dom_supply - 1) } : p
          )
        );
      }
      
      // Optimistic update for profile points
      if (previousProfile) {
         queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, (oldProfile = {}) => ({
          ...oldProfile,
          points: (oldProfile.points ?? variables.currentSubPoints) - variables.costPoints,
          dom_points: (oldProfile.dom_points ?? variables.currentDomPoints) + variables.domEarn,
        }));
      } else { // Fallback if profile not in cache, set based on variables
        queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, {
            points: variables.currentSubPoints - variables.costPoints,
            dom_points: variables.currentDomPoints + variables.domEarn,
        });
      }

      return { previousPunishments, previousProfile };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Punishment Applied",
        description: `${variables.punishmentTitle || 'The punishment'} has been successfully applied.`,
      });
      // The original onSuccess had syncCardById and updateProfilePoints.
      // These are now handled by optimistic updates and invalidations in onSettled.
    },
    onError: (error, variables, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData<ProfilePoints>(PROFILE_QUERY_KEY, context.previousProfile);
      }
      console.error('Error applying punishment:', error);
      // Avoid double toasting if validation error already toasted (e.g. by mutationFn pre-checks)
      if (error.message !== "Punishment has no supply left") {
        toast({
          title: "Failed to Apply Punishment",
          description: error.message || "There was a problem applying this punishment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['punishments', variables.id] }); // Specific punishment
      }
    },
  });
};
