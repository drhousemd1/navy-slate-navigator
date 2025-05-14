/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, QueryObserverResult, RefetchOptions, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getLocalDateString } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { useCreateTask } from "@/data/mutations/useCreateTask";
import { useCompleteTask } from "@/data/mutations/useCompleteTask";
import { saveTasksToDB } from "@/data/indexedDB/useIndexedDB";
import { syncCardById } from "@/data/sync/useSyncManager";

const TASKS_QUERY_KEY = ['tasks'];
const TASK_COMPLETIONS_QUERY_KEY = ['task-completions'];
const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics'];

const fetchTasks = async (): Promise<Task[]> => {
  const startTime = performance.now();
  console.log('[TasksDataHandler] Fetching tasks from the server');
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  const tasks: Task[] = data.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    points: task.points,
    priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
    completed: task.completed,
    background_image_url: task.background_image_url,
    background_opacity: task.background_opacity,
    focal_point_x: task.focal_point_x,
    focal_point_y: task.focal_point_y,
    frequency: task.frequency as 'daily' | 'weekly',
    frequency_count: (task.frequency_count && Number(task.frequency_count) > 0 ? Number(task.frequency_count) : 1), // Ensure at least 1
    usage_data: Array.isArray(task.usage_data) 
      ? task.usage_data.map(val => typeof val === 'number' ? val : Number(val)) 
      : Array(7).fill(0),
    icon_name: task.icon_name,
    icon_url: task.icon_url,
    icon_color: task.icon_color,
    highlight_effect: task.highlight_effect,
    title_color: task.title_color,
    subtext_color: task.subtext_color,
    calendar_color: task.calendar_color,
    last_completed_date: task.last_completed_date,
    created_at: task.created_at,
    updated_at: task.updated_at
  }));

  const today = getLocalDateString();
  const tasksToReset = tasks.filter(task => 
    task.completed && 
    task.frequency === 'daily' && 
    task.last_completed_date !== today
  );

  if (tasksToReset.length > 0) {
    console.log(`[TasksDataHandler] Resetting ${tasksToReset.length} daily tasks that are not completed today`);
    
    const updates = tasksToReset.map(task => ({
      id: task.id,
      completed: false,
      // Optionally reset usage_data for daily tasks if needed, though current logic only resets 'completed'
    }));

    // This batch update is fine, but consider if individual syncs are needed
    // For now, assume the refetch on success of mutations or periodic sync handles detailed updates.
    for (const update of updates) {
      await supabase
        .from('tasks')
        .update({ completed: false }) // Potentially add other fields to reset here
        .eq('id', update.id);
    }

    const updatedTasks = tasks.map(task => {
      if (tasksToReset.some(resetTask => resetTask.id === task.id)) {
        return { ...task, completed: false };
      }
      return task;
    });
    
    const endTime = performance.now();
    console.log(`[TasksDataHandler] Fetched and processed ${tasks.length} tasks in ${(endTime - startTime).toFixed(2)}ms`);
    
    return updatedTasks;
  }
  
  const endTime = performance.now();
  console.log(`[TasksDataHandler] Fetched ${tasks.length} tasks in ${(endTime - startTime).toFixed(2)}ms`);

  return tasks;
};

export const useTasksData = () => {
  const queryClient = useQueryClient();
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    ...STANDARD_QUERY_CONFIG, // Use our standardized configuration from react-query-config.ts
  });

  // Use our new mutation hooks
  const { mutateAsync: createTaskMutation } = useCreateTask();
  const { mutateAsync: completeTaskMutation } = useCompleteTask();

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      // Fix the task priority and frequency types to ensure they're one of the allowed values
      // Also ensure usage_data is properly formatted as number[] array
      const processedTaskData = {
        ...taskData,
        // Ensure priority is one of the allowed types
        priority: (taskData.priority || 'medium') as 'low' | 'medium' | 'high',
        // Ensure frequency is one of the allowed types
        frequency: (taskData.frequency || 'daily') as 'daily' | 'weekly',
        // Ensure usage_data is a properly formatted number[] array
        usage_data: Array.isArray(taskData.usage_data) 
          ? taskData.usage_data.map(val => typeof val === 'number' ? val : Number(val))
          : Array(7).fill(0)
      };
      
      const savedTask = await createTaskMutation(processedTaskData);
      
      // Fix: Ensure the returned task has the correct types
      return {
        ...savedTask,
        priority: (savedTask.priority as 'low' | 'medium' | 'high') || 'medium',
        frequency: (savedTask.frequency as 'daily' | 'weekly') || 'daily',
        // Ensure usage_data is returned as a proper number array
        usage_data: Array.isArray(savedTask.usage_data) 
          ? savedTask.usage_data.map(val => typeof val === 'number' ? val : Number(val))
          : Array(7).fill(0),
      };
    } catch (err: any) {
      console.error('Error saving task:', err);
      toast({
        title: 'Error saving task',
        description: err.message || 'Could not save task',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      // Update local cache
      const previousTasks = tasks || [];
      const updatedTasks = previousTasks.filter(t => t.id !== taskId);
      
      // We keep this direct cache update since deletion isn't part of our mutation hooks
      await saveTasksToDB(updatedTasks);
      
      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error deleting task',
        description: err.message || 'Could not delete task',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleTaskCompletion = async (taskId: string, markCompleted: boolean): Promise<boolean> => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        toast({ title: 'Error', description: 'Task not found.', variant: 'destructive' });
        return false;
      }

      let newUsageData = [...(task.usage_data || Array(7).fill(0))];
      let newCompletedStatus = task.completed;
      const todayIndex = getMondayBasedDay();
      const currentCompletionsToday = newUsageData[todayIndex] || 0;
      const maxCompletions = (task.frequency_count && task.frequency_count > 0) ? task.frequency_count : 1;

      const updates: Partial<Task> = {
        updated_at: new Date().toISOString(),
      };

      if (markCompleted) {
        if (currentCompletionsToday >= maxCompletions) {
          toast({ title: 'Task Completion', description: 'Already completed maximum times for today.', variant: 'default' });
          return true; // Already at max, no change but not an error
        }
        newUsageData[todayIndex] = currentCompletionsToday + 1;
        newCompletedStatus = newUsageData[todayIndex] >= maxCompletions;
        
        updates.usage_data = newUsageData;
        updates.completed = newCompletedStatus;
        updates.last_completed_date = getLocalDateString();

      } else { // Un-marking as complete
        // Decrement usage_data if it makes sense for the app logic, or just unmark
        // For simplicity, we'll just unmark 'completed' and clear 'last_completed_date'
        // If a more complex "undo" is needed for usage_data, that logic would go here.
        // newUsageData[todayIndex] = Math.max(0, currentCompletionsToday - 1); // Example if decrementing
        newCompletedStatus = false;

        updates.usage_data = newUsageData; // Or task.usage_data if not decrementing
        updates.completed = newCompletedStatus;
        // updates.last_completed_date = null; // Or keep if you want to know the last actual completion
      }
      
      await completeTaskMutation({ taskId, updates });
      
      // Optimistically update the local cache - useQueryClient might be better here
      // but completeTaskMutation already calls syncCardById which should trigger refetch/cache update.
      // For immediate UI feedback:
      queryClient.setQueryData(TASKS_QUERY_KEY, (oldData: Task[] | undefined) => 
        oldData ? oldData.map(t => t.id === taskId ? { ...t, ...updates } : t) : []
      );

      return true;
    } catch (err: any) {
      console.error('Error updating task completion:', err);
      toast({
        title: 'Error updating task',
        description: err.message || 'Could not update task completion status',
        variant: 'destructive',
      });
      return false;
    }
  };

  const refetchTasks = async (
    options?: RefetchOptions
  ): Promise<QueryObserverResult<Task[], Error>> => {
    console.log('[TasksDataHandler] Manually refetching tasks');
    return refetch(options);
  };

  return {
    tasks,
    isLoading,
    error,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetchTasks
  };
};
