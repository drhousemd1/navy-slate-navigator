
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { toast } from "@/hooks/use-toast";
import { getCurrentDayOfWeek } from "@/lib/taskUtils";

// Updates an existing task in Supabase, then re-syncs that task locally
export function useCompleteTask() {
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      console.log(`[useCompleteTask] Updating task ${taskId} with:`, updates);
      
      // If this is a daily/weekly task with usage_data, ensure it's properly formatted
      if (updates.usage_data && Array.isArray(updates.usage_data)) {
        // Make sure array is exactly 7 days long (0=Monday, 6=Sunday)
        if (updates.usage_data.length !== 7) {
          console.warn('[useCompleteTask] usage_data array is not 7 days long, padding with zeros');
          const newArray = Array(7).fill(0);
          // Copy existing data if array is shorter
          for (let i = 0; i < Math.min(updates.usage_data.length, 7); i++) {
            newArray[i] = updates.usage_data[i];
          }
          updates.usage_data = newArray;
        }
        
        // Log the day of week for debugging
        const today = getCurrentDayOfWeek(); 
        console.log(`[useCompleteTask] Current day of week: ${today}, value: ${updates.usage_data[today]}`);
      }
      
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
