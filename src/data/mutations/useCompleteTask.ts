
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";

// Updates an existing task in Supabase, then re-syncs that task locally
export function useCompleteTask() {
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: async (taskId) => {
      await syncCardById(taskId, "tasks");
    }
  });
}
