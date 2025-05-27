import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { PunishmentData } from "@/contexts/punishments/types";
import { WEEKLY_METRICS_QUERY_KEY } from "@/data/queries/metrics/useWeeklyMetrics";
import { MONTHLY_METRICS_QUERY_KEY } from "@/data/queries/metrics/useMonthlyMetrics";
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';
import { logger } from '@/lib/logger';

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
  const WEEKLY_METRICS_SUMMARY_QUERY_KEY = ['weekly-metrics-summary'];
  const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics']; // For Throne Room
  const MONTHLY_METRICS_QUERY_KEY = ['monthly-metrics']; // For Throne Room

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
      
      let actualDomUserId = profileId; 
      const { data: subUserProfile } = await supabase.from('profiles').select('linked_partner_id').eq('id', profileId).single();
      if (subUserProfile?.linked_partner_id) {
        actualDomUserId = subUserProfile.linked_partner_id;
      }

      // Update submissive user's points
      const newSubPoints = currentSubPoints - costPoints;
      const { error: subProfileUpdateError } = await supabase
        .from("profiles")
        .update({
          points: newSubPoints,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId); 
      if (subProfileUpdateError) throw subProfileUpdateError;

      // Update dominant user's dom_points
      const { data: domUserProfile, error: domUserFetchError } = await supabase
        .from('profiles')
        .select('dom_points')
        .eq('id', actualDomUserId)
        .single();
      if (domUserFetchError) throw domUserFetchError;

      const currentActualDomPoints = domUserProfile?.dom_points || 0;
      const newActualDomPoints = currentActualDomPoints + domEarn;
      const { error: domProfileUpdateError } = await supabase
        .from("profiles")
        .update({
          dom_points: newActualDomPoints,
          updated_at: new Date().toISOString(),
        })
        .eq("id", actualDomUserId);
      if (domProfileUpdateError) throw domProfileUpdateError;
      
      return {
        success: true,
        punishmentId: id,
        newSubPoints: newSubPoints, 
        newDomPoints: newActualDomPoints, 
      };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });

      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      // const previousProfile = queryClient.getQueryData<ProfilePoints>(PROFILE_QUERY_KEY); // Removed

      if (previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (oldPunishments = []) =>
          oldPunishments.map(p =>
            p.id === variables.id ? { ...p, dom_supply: Math.max(0, p.dom_supply - 1) } : p
          )
        );
      }
      
      return { previousPunishments, previousProfile: undefined /* previousProfile removed */ };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Punishment Applied",
        description: `${variables.punishmentTitle || 'The punishment'} has been successfully applied.`,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
      logger.error('Error applying punishment:', error);
      if (error.message !== "Punishment has no supply left") {
        toast({
          title: "Failed to Apply Punishment",
          description: error.message || "There was a problem applying this punishment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSettled: async (data, error, variables) => { 
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['punishments', variables.id] });
      }

      const subUserId = variables.profileId;
      let domUserId = subUserId; 
      try {
        const { data: profileData } = await supabase.from('profiles').select('linked_partner_id').eq('id', subUserId).single();
        if (profileData?.linked_partner_id) {
          domUserId = profileData.linked_partner_id;
        }
      } catch (e) {
        logger.error("Error fetching profile for domUserId in onSettled:", e);
      }

      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
      queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] });
      
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_SUMMARY_QUERY_KEY });
    },
  });
};
