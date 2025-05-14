
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

/* DO NOT COPY THIS HEADER: this file is the single source of truth.
   Do not place Supabase calls in UI components. */

export function useCreateRule() {
  return useMutation({
    mutationFn: async (newRule: any) => {
      const { data, error } = await supabase.from("rules").insert([newRule]).select().single();
      if (error) throw error;
      return data;                         // has id
    },
    onSuccess: async (row) => {
      await syncCardById(row.id, "rules");
    }
  });
}
