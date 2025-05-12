
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { syncCardById } from "../sync/useSyncManager";

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

    onSuccess: async ({ rewardId, newSupply, newPoints }) => {
      await syncCardById(rewardId, "rewards");

      // update rewards list cache
      const list = (queryClient.getQueryData<any[]>(["rewards"]) || []).map(r =>
        r.id === rewardId ? { ...r, supply: newSupply } : r
      );
      queryClient.setQueryData(["rewards"], list);

      // recalc header supply totals
      const subSupply = list.filter(r => !r.is_dom_reward).reduce((n, r) => n + r.supply, 0);
      const domSupply = list.filter(r => r.is_dom_reward).reduce((n, r) => n + r.supply, 0);
      queryClient.setQueryData(["totalRewardsSupply"], subSupply);
      queryClient.setQueryData(["totalDomRewardsSupply"], domSupply);

      // update profile points cache
      queryClient.setQueryData(["rewards", "points"], newPoints);
    }
  });
}
