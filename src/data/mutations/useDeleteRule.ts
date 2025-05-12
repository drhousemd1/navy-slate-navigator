
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { saveRulesToDB } from "../indexedDB/useIndexedDB";

export function useDeleteRule() {
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from("rules").delete().eq("id", ruleId);
      if (error) throw error;
      return ruleId;
    },
    onSuccess: async (ruleId) => {
      const list = (queryClient.getQueryData<any[]>(["rules"]) || []).filter(r => r.id !== ruleId);
      queryClient.setQueryData(["rules"], list);
      await saveRulesToDB(list);
    }
  });
}
