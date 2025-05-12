
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

export function useCreateReward() {
  return useMutation({
    mutationFn: async (newReward: any) => {
      const { data, error } = await supabase.from("rewards").insert([newReward]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (created) => {
      await syncCardById(created.id, "rewards");
    }
  });
}
