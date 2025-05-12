
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

// DATA‑LAYER ONLY.  Do not duplicate Supabase logic in UI components.
export function useCreatePunishment() {
  return useMutation({
    mutationFn: async (newPun: any) => {
      const { data, error } = await supabase.from("punishments")
        .insert([newPun])
        .select()
        .single();
      if (error) throw error;
      return data;           // contains id
    },
    onSuccess: async (row) => {
      await syncCardById(row.id, "punishments");
    }
  });
}
