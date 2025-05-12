
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

export function useRedeemSubReward() {
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
      if (currentSupply <= 0) throw new Error("No supply");

      await supabase.from("rewards")
        .update({ supply: currentSupply - 1 })
        .eq("id", rewardId);

      await supabase.from("reward_usage").insert([{
        reward_id: rewardId,
        profile_id: profileId,
        used: false,
        day_of_week: new Date().getDay(),
        week_number: `${new Date().getFullYear()}-W${((d => (d.setUTCDate(d.getUTCDate()+4-(
          d.getUTCDay()||7)), Math.ceil((((d.getTime()-Date.UTC(d.getUTCFullYear(),0,1))/864e5)+1)/7)
        )))(new Date()))}`
      }]);

      return { rewardId };
    },
    onSuccess: async ({ rewardId }) => {
      await syncCardById(rewardId, "rewards");
    }
  });
}
