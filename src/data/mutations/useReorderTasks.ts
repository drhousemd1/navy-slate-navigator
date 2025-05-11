
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { saveTasksToDB } from '@/data/indexedDB/useIndexedDB';

interface ReorderTasksParams {
  tasks: Task[];
  newOrder: string[]; // Array of task IDs in the new order
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tasks, newOrder }: ReorderTasksParams): Promise<Task[]> => {
      try {
        // Create a map of tasks by ID for quick lookup
        const tasksById = tasks.reduce((acc, task) => {
          acc[task.id] = task;
          return acc;
        }, {} as Record<string, Task>);
        
        // Create an array of tasks in the new order
        const reorderedTasks = newOrder.map((id, index) => ({
          ...tasksById[id],
          order: index
        }));
        
        // Update each task individually to avoid bulk update issues
        for (const task of reorderedTasks) {
          const { error } = await supabase
            .from('tasks')
            .update({
              order: task.order,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id);
            
          if (error) {
            console.error(`Error updating task order for ${task.id}:`, error);
            throw error;
          }
        }
        
        return reorderedTasks;
      } catch (err) {
        console.error('Error reordering tasks:', err);
        throw err;
      }
    },
    onSuccess: (reorderedTasks) => {
      // Update cache with the reordered tasks
      queryClient.setQueryData(['tasks'], reorderedTasks);
      
      // Update IndexedDB
      saveTasksToDB(reorderedTasks);
      
      toast({
        title: 'Success',
        description: 'Tasks reordered successfully'
      });
    },
    onError: (error) => {
      console.error('Error in useReorderTasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder tasks',
        variant: 'destructive'
      });
      
      // Refetch tasks to ensure correct order
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}
