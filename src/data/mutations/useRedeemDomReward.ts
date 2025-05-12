
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { syncCardById } from "../sync/useSyncManager";

export function useRedeemDomReward() {
  return useMutation({
    mutationFn: async ({
      rewardId,
      currentSupply,
      profileId
    }: {
      rewardId: string;
      currentSupply: number;
      profileId: string;
    }) => {
      if (currentSupply <= 0) throw new Error("No supply available");

      const { error: supplyErr } = await supabase
        .from("rewards")
        .update({ supply: currentSupply - 1 })
        .eq("id", rewardId);
      if (supplyErr) throw supplyErr;

      // Record usage in the reward_usage table
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;

      await supabase.from("reward_usage").insert([{ 
        reward_id: rewardId,
        day_of_week: dayOfWeek,
        week_number: weekNumber
      }]);

      return { rewardId, newSupply: currentSupply - 1 };
    },

    onSuccess: async ({ rewardId, newSupply }) => {
      await syncCardById(rewardId, "rewards");

      const list = (queryClient.getQueryData<any[]>(["rewards"]) || []).map(r =>
        r.id === rewardId ? { ...r, supply: newSupply } : r
      );
      queryClient.setQueryData(["rewards"], list);

      const subSupply = list.filter(r => !r.is_dom_reward).reduce((n, r) => n + r.supply, 0);
      const domSupply = list.filter(r => r.is_dom_reward).reduce((n, r) => n + r.supply, 0);
      queryClient.setQueryData(["totalRewardsSupply"], subSupply);
      queryClient.setQueryData(["totalDomRewardsSupply"], domSupply);
    }
  });
}
