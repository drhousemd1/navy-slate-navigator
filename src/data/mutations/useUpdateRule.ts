
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

export function useUpdateRule() {
  return useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: string; updates: any }) => {
      const { error } = await supabase.from("rules").update(updates).eq("id", ruleId);
      if (error) throw error;
      return ruleId;
    },
    onSuccess: async (ruleId) => {
      await syncCardById(ruleId, "rules");
    }
  });
}
