
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../queryClient";
import { supabase } from '@/integrations/supabase/client';
import { Task } from "@/lib/taskUtils";
import { saveTasksToDB } from "../indexeddb/useIndexedDB";

// Interface for reordering tasks
interface ReorderTasksParams {
  taskId: string;
  newIndex: number;
}

// Function to reorder tasks
const reorderTasks = async ({ taskId, newIndex }: ReorderTasksParams): Promise<Task[]> => {
  // Get all current tasks to update their order
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (fetchError) throw fetchError;
  
  // Find the task to move
  const taskToMove = tasks?.find(task => task.id === taskId);
  if (!taskToMove) throw new Error("Task not found");
  
  // Create a new array with the task moved to the new position
  const reorderedTasks = tasks ? 
    [
      ...tasks.filter(task => task.id !== taskId).slice(0, newIndex),
      taskToMove,
      ...tasks.filter(task => task.id !== taskId).slice(newIndex)
    ] : [];
  
  // No need to update in database since we're just changing local order
  // If we needed persistence, we could add an 'order' field to the tasks table
  
  return reorderedTasks;
};

// Hook for reordering tasks
export function useReorderTasks() {
  return useMutation({
    mutationFn: reorderTasks,
    onSuccess: (reorderedTasks) => {
      // Update tasks in cache
      queryClient.setQueryData(['tasks'], reorderedTasks);
      
      // Update IndexedDB
      saveTasksToDB(reorderedTasks);
    }
  });
}
