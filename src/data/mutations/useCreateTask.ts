
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncCardById } from "../sync/useSyncManager";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

// Creates a new task in Supabase, then syncs that task locally
export function useCreateTask() {
  const { user } = useAuth(); // Get the authenticated user

  return useMutation({
    mutationFn: async (newTask: any) => {
      if (!user) throw new Error("User not authenticated to create task");
      
      const taskWithUser = { ...newTask, user_id: user.id }; // Add user_id
      const { data, error } = await supabase.from("tasks").insert([taskWithUser]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (data?.id) {
        await syncCardById(data.id, "tasks");
      }
    }
  });
}

