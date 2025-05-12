
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

/** Returns ISO-8601 week string like "2025-W20" **/
function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;               // 1–7 (Mon–Sun)
  d.setUTCDate(d.getUTCDate() + 4 - day);       // to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

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

      await supabase.from("reward_usage").insert([{
        reward_id: rewardId,
        profile_id: profileId,
        used: false,
        day_of_week: new Date().getDay(),
        week_number: getISOWeekString(new Date())
      }]);

      return { rewardId };
    },
    onSuccess: async ({ rewardId }) => {
      await syncCardById(rewardId, "rewards");
    }
  });
}
