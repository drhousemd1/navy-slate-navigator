
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { updateProfilePoints } from "../sync/updateProfilePoints";
import { queryClient } from "../queryClient";

export function useBuyDomReward() {
  return useMutation({
    mutationFn: async ({
      rewardId,
      cost,
      currentSupply,
      profileId,
      currentDomPoints
    }: {
      rewardId: string;
      cost: number;
      currentSupply: number;
      profileId: string;
      currentDomPoints: number;
    }) => {
      if (currentDomPoints < cost) throw new Error("Insufficient dom-points");

      await supabase.from("rewards")
        .update({ supply: currentSupply + 1 })
        .eq("id", rewardId);

      await supabase.from("profiles")
        .update({ dom_points: currentDomPoints - cost })
        .eq("id", profileId);

      return { rewardId, newDomPoints: currentDomPoints - cost };
    },
    onSuccess: async ({ rewardId, newDomPoints }) => {
      await syncCardById(rewardId, "rewards");
      await updateProfilePoints(
        queryClient.getQueryData<any>(["profile_points"])?.points ?? 0,
        newDomPoints
      );
    }
  });
}
