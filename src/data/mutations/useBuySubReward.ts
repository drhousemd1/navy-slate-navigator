
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { updateProfilePoints } from "../sync/updateProfilePoints";
import { queryClient } from "../queryClient";

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

      await supabase.from("rewards")
        .update({ supply: currentSupply + 1 })
        .eq("id", rewardId);

      await supabase.from("profiles")
        .update({ points: currentPoints - cost })
        .eq("id", profileId);

      return { rewardId, newPoints: currentPoints - cost };
    },
    onSuccess: async ({ rewardId, newPoints }) => {
      await syncCardById(rewardId, "rewards");
      await updateProfilePoints(newPoints, queryClient.getQueryData<any>(["profile_points"])?.dom_points ?? 0);
    }
  });
}
