
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      if (currentSupply <= 0) throw new Error("No supply");

      await supabase.from("rewards")
        .update({ supply: currentSupply - 1 })
        .eq("id", rewardId);

      await supabase.from("reward_usage")
        .insert([{ reward_id: rewardId, profile_id: profileId }]);

      return { rewardId };
    },
    onSuccess: async ({ rewardId }) => {
      await syncCardById(rewardId, "rewards");
    }
  });
}
