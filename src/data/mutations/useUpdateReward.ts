
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

export function useUpdateReward() {
  return useMutation({
    mutationFn: async ({ rewardId, updates }: { rewardId: string; updates: any }) => {
      const { error } = await supabase.from("rewards").update(updates).eq("id", rewardId);
      if (error) throw error;
      return rewardId;
    },
    onSuccess: async (rewardId) => {
      await syncCardById(rewardId, "rewards");
    }
  });
}
