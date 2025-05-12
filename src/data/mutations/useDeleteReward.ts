
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { saveRewardsToDB } from "../indexedDB/useIndexedDB";

export function useDeleteReward() {
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase.from("rewards").delete().eq("id", rewardId);
      if (error) throw error;
      return rewardId;
    },
    onSuccess: async (rewardId) => {
      const list = (queryClient.getQueryData<any[]>(["rewards"]) || []).filter(r => r.id !== rewardId);
      queryClient.setQueryData(["rewards"], list);
      await saveRewardsToDB(list);
    }
  });
}
