
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Task } from "@/lib/taskUtils";
import { loadTasksFromDB, saveTasksToDB } from "../indexedDB/useIndexedDB";

// Fetch tasks from Supabase
const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // Save to IndexedDB for offline access
  await saveTasksToDB(data || []);
  
  return data || [];
};

// Hook for accessing tasks
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    // Fix: initialData needs to be direct data, not a function returning a Promise
    initialData: [],
    staleTime: Infinity,
    // Add placeholderData to load cached data asynchronously
    placeholderData: async () => {
      try {
        return await loadTasksFromDB() || [];
      } catch (error) {
        console.error("Error loading cached tasks:", error);
        return [];
      }
    },
  });
}
