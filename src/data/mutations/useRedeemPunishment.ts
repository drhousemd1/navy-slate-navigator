
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { updateProfilePoints } from "../sync/updateProfilePoints";

// DATA‑LAYER ONLY.  Do not duplicate Supabase logic in UI components.
export function useRedeemPunishment() {
  return useMutation({
    mutationFn: async ({
      id,
      domSupply,
      costPoints,
      domEarn,
      profileId,
      subPoints,
      domPoints
    }: {
      id: string;
      domSupply: number;
      costPoints: number;
      domEarn: number;
      profileId: string;
      subPoints: number;
      domPoints: number;
    }) => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = `${today.getFullYear()}-W${Math.ceil(
        ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(today.getFullYear(), 0, 1).getDay() + 1) / 7
      )}`;

      // 1. Log usage history
      await supabase.from("punishment_history").insert([
        {
          punishment_id: id,
          day_of_week: dayOfWeek,
          points_deducted: costPoints,
          applied_date: today.toISOString()
        }
      ]);

      // 2. Update dom_supply column (not "supply")
      await supabase.from("punishments")
        .update({ dom_points: domSupply + 1 })
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
