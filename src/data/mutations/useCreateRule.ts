
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

/* DO NOT COPY THIS HEADER: this file is the single source of truth.
   Do not place Supabase calls in UI components. */

export function useCreateRule() {
  const { user } = useAuth(); // Get the authenticated user

  return useMutation({
    mutationFn: async (newRule: any) => {
      if (!user) throw new Error("User not authenticated to create rule");

      const ruleWithUser = { ...newRule, user_id: user.id }; // Add user_id
      const { data, error } = await supabase.from("rules").insert([ruleWithUser]).select().single();
      if (error) throw error;
      return data;                         // has id
    },
    onSuccess: async (row) => {
      await syncCardById(row.id, "rules");
    }
  });
}

