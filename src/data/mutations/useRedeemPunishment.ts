
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { updateProfilePoints } from "../sync/updateProfilePoints";

// DATA‑LAYER ONLY.  Do not duplicate Supabase logic in UI components.
export function useRedeemPunishment() {
  return useMutation({
    mutationFn: async ({
      id,
      domSupply, // This seems to be related to 'punishments' table dom_points, not history
      costPoints,
      domEarn,
      profileId, // This is the user_id
      subPoints,
      domPoints
    }: {
      id: string; // punishment_id
      domSupply: number; // current dom_points on the punishment itself
      costPoints: number;
      domEarn: number;
      profileId: string; // user_id
      subPoints: number;
      domPoints: number;
    }) => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      // const weekNumber = `${today.getFullYear()}-W${Math.ceil( // weekNumber not used in this mutation
      //   ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(today.getFullYear(), 0, 1).getDay() + 1) / 7
      // )}`;

      // 1. Log usage history
      await supabase.from("punishment_history").insert([
        {
          punishment_id: id,
          user_id: profileId, // Added user_id here
          day_of_week: dayOfWeek,
          points_deducted: costPoints,
          applied_date: today.toISOString()
        }
      ]);

      // 2. Update dom_supply column (dom_points on punishments table)
      // The parameter was domSupply, implying it's the current value.
      // If this is meant to increment, it should be `dom_points: domSupply + 1`
      // If it's an accumulation, it might be different. The original code used `dom_points: domSupply + 1`.
      // Let's assume it's incrementing the punishment's own dom_points counter.
      await supabase.from("punishments")
        .update({ dom_points: domSupply + 1 }) // Assuming domSupply is the current value from punishments.dom_points
        .eq("id", id);

      // 3. Update profile totals
      await supabase.from("profiles").update({
        points: subPoints - costPoints,
        dom_points: domPoints + domEarn,
      }).eq("id", profileId);

      return {
        id,
        newSub: subPoints - costPoints,
        newDom: domPoints + domEarn,
      };
    },

    onSuccess: async ({ id, newSub, newDom }) => {
      await syncCardById(id, "punishments");
      await updateProfilePoints(newSub, newDom);
    },
  });
}

