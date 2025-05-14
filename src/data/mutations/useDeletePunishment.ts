
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient";
import { savePunishmentsToDB } from "../indexedDB/useIndexedDB";

// DATA‑LAYER ONLY.  Do not duplicate Supabase logic in UI components.
export function useDeletePunishment() {
  return useMutation({
    mutationFn: async (punId: string) => {
      await supabase.from("punishments").delete().eq("id", punId);
      return punId;
    },
    onSuccess: async (punId) => {
      const list =
        (queryClient.getQueryData<any[]>(["punishments"]) || [])
          .filter(p => p.id !== punId);
      queryClient.setQueryData(["punishments"], list);
      await savePunishmentsToDB(list);
    }
  });
}
