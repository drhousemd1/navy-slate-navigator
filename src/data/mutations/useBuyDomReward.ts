
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { syncCardById } from "../sync/useSyncManager";
import { updateProfilePoints } from "../sync/updateProfilePoints";

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

      const { error: supplyErr } = await supabase
        .from("rewards")
        .update({ supply: currentSupply + 1 })
        .eq("id", rewardId);
      if (supplyErr) throw supplyErr;

      const { error: ptsErr } = await supabase
        .from("profiles")
        .update({ dom_points: currentDomPoints - cost })
        .eq("id", profileId);
      if (ptsErr) throw ptsErr;

      return { rewardId, newSupply: currentSupply + 1, newDomPoints: currentDomPoints - cost };
    },

    onSuccess: async ({ rewardId, newDomPoints }) => {
      const prev = queryClient.getQueryData<{points: number, dom_points: number}>(["profile_points"]) || { points: 0, dom_points: 0 };
      // Update both the generic profile_points cache key and the reward-specific keys
      await updateProfilePoints(prev.points, newDomPoints);
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      await queryClient.invalidateQueries({ queryKey: ['rewards', 'dom_points'] });
      await queryClient.invalidateQueries({ queryKey: ['totalDomRewardsSupply'] });
      await syncCardById(rewardId, "rewards");
    }
  });
}
