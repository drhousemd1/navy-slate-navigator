
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { syncCardById } from "../sync/useSyncManager";

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

    onSuccess: async ({ rewardId, newSupply, newDomPoints }) => {
      await syncCardById(rewardId, "rewards");

      const list = (queryClient.getQueryData<any[]>(["rewards"]) || []).map(r =>
        r.id === rewardId ? { ...r, supply: newSupply } : r
      );
      queryClient.setQueryData(["rewards"], list);

      const subSupply = list.filter(r => !r.is_dom_reward).reduce((n, r) => n + r.supply, 0);
      const domSupply = list.filter(r => r.is_dom_reward).reduce((n, r) => n + r.supply, 0);
      queryClient.setQueryData(["totalRewardsSupply"], subSupply);
      queryClient.setQueryData(["totalDomRewardsSupply"], domSupply);

      queryClient.setQueryData(["rewards", "dom_points"], newDomPoints);
    }
  });
}
