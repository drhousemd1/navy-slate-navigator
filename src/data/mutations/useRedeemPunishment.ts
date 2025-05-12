
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { updateProfilePoints } from "../sync/updateProfilePoints";

// DATA‑LAYER ONLY.  Do not duplicate Supabase logic in UI components.
export function useRedeemPunishment() {
  return useMutation({
    mutationFn: async ({
      punId,
      supply,
      costPoints,
      domEarn,
      profileId,
      subPoints,
      domPoints
    }: {
      punId: string;
      supply: number;
      costPoints: number;
      domEarn: number;
      profileId: string;
      subPoints: number;
      domPoints: number;
    }) => {
      // 1 increment supply
      await supabase.from("punishments")
        .update({ supply: supply + 1 })
        .eq("id", punId);

      // 2 log usage
      await supabase.from("punishment_usage").insert([{
        punishment_id: punId,
        profile_id: profileId,
        used_at: new Date().toISOString()
      }]);

      // 3 update profile totals
      await supabase.from("profiles").update({
        points: subPoints - costPoints,
        dom_points: domPoints + domEarn
      }).eq("id", profileId);

      return {
        punId,
        newSub: subPoints - costPoints,
        newDom: domPoints + domEarn
      };
    },
    onSuccess: async ({ punId, newSub, newDom }) => {
      await syncCardById(punId, "punishments");
      await updateProfilePoints(newSub, newDom);
    }
  });
}
