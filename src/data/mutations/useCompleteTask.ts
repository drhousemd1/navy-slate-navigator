
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
import { syncCardById } from '@/data/sync/useSyncManager';
import { format } from 'date-fns';

interface CompleteTaskParams {
  taskId: string;
  completed: boolean;
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, completed }: CompleteTaskParams): Promise<Task> => {
      // Get the current date for tracking
      const now = new Date();
      const currentDate = format(now, 'yyyy-MM-dd');
      const currentWeek = `${format(now, 'yyyy')}-W${format(now, 'ww')}`;
      
      const updates = {
        completed,
        updated_at: now.toISOString(),
        last_completed_date: completed ? currentDate : null,
        week_identifier: completed ? currentWeek : null
      };
      
      // Update task in Supabase
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
        
      if (error) {
        console.error('Error completing task:', error);
        throw error;
      }
      
      // If task was completed, record the completion in history
      if (completed) {
        const { error: historyError } = await supabase
          .from('task_completion_history')
          .insert({
            task_id: taskId,
            completed_at: now.toISOString()
          });
          
        if (historyError) {
          console.error('Error recording task completion history:', historyError);
          // We don't throw here, as the main task update was successful
        }
      }
      
      return data as Task;
    },
    onSuccess: (updatedTask) => {
      // Update cache
      queryClient.setQueryData(['tasks'], (oldTasks: Task[] = []) => {
        const updatedTasks = oldTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
        
        // Update IndexedDB
        saveTasksToDB(updatedTasks);
        
        return updatedTasks;
      });
      
      // Sync the individual card
      syncCardById(updatedTask.id, 'tasks');
      
      // Invalidate metrics queries since task completion affects them
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      
      const action = updatedTask.completed ? 'completed' : 'uncompleted';
      toast({
        title: 'Success',
        description: `Task ${action} successfully`
      });
    },
    onError: (error) => {
      console.error('Error in useCompleteTask:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task completion status',
        variant: 'destructive'
      });
    }
  });
}
