
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { syncCardById } from "../sync/useSyncManager";
import { updateProfilePoints } from "../sync/updateProfilePoints";

export function useBuySubReward() {
  return useMutation({
    mutationFn: async ({
      rewardId,
      cost,
      currentSupply,
      profileId,
      currentPoints
    }: {
      rewardId: string;
      cost: number;
      currentSupply: number;
      profileId: string;
      currentPoints: number;
    }) => {
      if (currentPoints < cost) throw new Error("Insufficient points");

      const { error: supplyErr } = await supabase
        .from("rewards")
        .update({ supply: currentSupply + 1 })
        .eq("id", rewardId);
      if (supplyErr) throw supplyErr;

      const { error: pointsErr } = await supabase
        .from("profiles")
        .update({ points: currentPoints - cost })
        .eq("id", profileId);
      if (pointsErr) throw pointsErr;

      return { rewardId, newSupply: currentSupply + 1, newPoints: currentPoints - cost };
    },

    onSuccess: async ({ rewardId, newPoints }) => {
      const prev = queryClient.getQueryData<{points: number, dom_points: number}>(["profile_points"]) || { points: 0, dom_points: 0 };
      await syncCardById(rewardId, "rewards");
      await updateProfilePoints(newPoints, prev.dom_points);
    }
  });
}
