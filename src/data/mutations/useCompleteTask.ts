
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
      // First, get the current task data to properly update usage_data
      const { data: taskData, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching task data:', fetchError);
        throw fetchError;
      }
      
      // Get the current date for tracking
      const now = new Date();
      const currentDate = format(now, 'yyyy-MM-dd');
      const currentWeek = `${format(now, 'yyyy')}-W${format(now, 'ww')}`;
      
      // Get current day of week (0-6, Sunday is 0)
      // We need to convert to Monday-based (0-6, Monday is 0)
      const currentDayNum = now.getDay();
      const mondayBasedDay = currentDayNum === 0 ? 6 : currentDayNum - 1;
      
      // Initialize or get the task's usage data array
      const usageData = Array.isArray(taskData.usage_data) ? 
        [...taskData.usage_data] : 
        Array(7).fill(0);
      
      // If task is being completed, increment the counter for today
      if (completed) {
        usageData[mondayBasedDay] = (usageData[mondayBasedDay] || 0) + 1;
      } 
      // If task is being uncompleted, decrement the counter (but not below 0)
      else {
        usageData[mondayBasedDay] = Math.max((usageData[mondayBasedDay] || 0) - 1, 0);
      }
      
      // Determine if task should be marked as fully completed
      // It's fully completed if today's usage meets or exceeds the frequency count
      const frequencyCount = taskData.frequency_count || 1;
      const fullyCompleted = usageData[mondayBasedDay] >= frequencyCount;
      
      const updates = {
        completed: fullyCompleted,
        updated_at: now.toISOString(),
        last_completed_date: completed ? currentDate : taskData.last_completed_date,
        week_identifier: completed ? currentWeek : taskData.week_identifier,
        usage_data: usageData
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
        // Get the current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('User not authenticated');
        }
        
        const { error: historyError } = await supabase
          .from('task_completion_history')
          .insert({
            task_id: taskId,
            completed_at: now.toISOString(),
            user_id: userData.user.id
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
      syncCardById(updatedTask.id);
      
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
