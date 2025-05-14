
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { toast } from "@/hooks/use-toast";

// Updates an existing task in Supabase, then re-syncs that task locally
export function useCompleteTask() {
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      console.log(`[useCompleteTask] Updating task ${taskId} with:`, updates);
      
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", taskId).select();
      
      if (error) {
        console.error('[useCompleteTask] Error updating task:', error);
        toast({
          title: 'Error updating task',
          description: error.message || 'Could not update task',
          variant: 'destructive',
        });
        throw error;
      }
      
      console.log('[useCompleteTask] Task updated successfully:', data);
      return taskId;
    },
    onSuccess: async (taskId) => {
      console.log(`[useCompleteTask] Task ${taskId} updated successfully, syncing...`);
      await syncCardById(taskId, "tasks");
    },
    onError: (error) => {
      console.error('[useCompleteTask] Error in mutation:', error);
    }
  });
}
