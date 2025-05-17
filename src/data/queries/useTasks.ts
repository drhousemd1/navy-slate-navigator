
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query"; // Changed from usePersistentQuery
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils'; // Assuming Task interface is correctly defined here
import { fetchTasks } from "./tasks/fetchTasks"; // Import the actual fetch function

export function useTasks() {
  return useQuery<Task[], Error>({ // Ensure Task[] is the correct return type of fetchTasks
    queryKey: ["tasks"],
    queryFn: fetchTasks, // Use the refactored fetchTasks
    // initialData: undefined, // Removed: Persister handles initial data hydration
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });
}

