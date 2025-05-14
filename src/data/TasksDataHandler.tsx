/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getLocalDateString } from '@/lib/taskUtils'; // Updated import for Task
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

const processRawTask = (rawTask: any): Task => {
  const validFrequencies: Task['frequency'][] = ['daily', 'weekly', 'monthly', 'one-time'];
  let freq: Task['frequency'] = 'one-time'; // Default frequency
  if (rawTask.frequency && validFrequencies.includes(rawTask.frequency as Task['frequency'])) {
    freq = rawTask.frequency as Task['frequency'];
  } else if (rawTask.frequency) {
    console.warn(`[TasksDataHandler] Invalid frequency value "${rawTask.frequency}" for task ID ${rawTask.id}. Defaulting to 'one-time'.`);
  }

  let bgImages: string[] | null = null;
  if (Array.isArray(rawTask.background_images)) {
    if (rawTask.background_images.every((item: any) => typeof item === 'string')) {
      bgImages = rawTask.background_images as string[];
    } else {
      console.warn(`[TasksDataHandler] Invalid items in background_images for task ID ${rawTask.id}. Expected string array.`, rawTask.background_images);
      const filteredImages = rawTask.background_images.filter((item: any) => typeof item === 'string');
      if (filteredImages.length > 0) {
        bgImages = filteredImages;
      }
    }
  } else if (rawTask.background_images !== null && rawTask.background_images !== undefined) {
     console.warn(`[TasksDataHandler] background_images for task ID ${rawTask.id} is not an array. Received:`, rawTask.background_images);
  }

  return {
    id: rawTask.id,
    title: rawTask.title,
    description: rawTask.description,
    points: rawTask.points,
    priority: (rawTask.priority as Task['priority']) || 'medium',
    completed: rawTask.completed,
    background_image_url: rawTask.background_image_url,
    background_images: bgImages,
    background_opacity: rawTask.background_opacity,
    focal_point_x: rawTask.focal_point_x,
    focal_point_y: rawTask.focal_point_y,
    frequency: freq,
    frequency_count: rawTask.frequency_count,
    usage_data: Array.isArray(rawTask.usage_data)
      ? rawTask.usage_data.map((val: any) => (typeof val === 'number' ? val : Number(val)))
      : Array(7).fill(0),
    icon_name: rawTask.icon_name,
    icon_url: rawTask.icon_url,
    icon_color: rawTask.icon_color,
    highlight_effect: rawTask.highlight_effect,
    title_color: rawTask.title_color,
    subtext_color: rawTask.subtext_color,
    calendar_color: rawTask.calendar_color,
    last_completed_date: rawTask.last_completed_date,
    created_at: rawTask.created_at,
    updated_at: rawTask.updated_at,
    user_id: rawTask.user_id,
    carousel_timer: rawTask.carousel_timer,
    week_identifier: rawTask.week_identifier,
  };
};


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

  const tasks: Task[] = data ? data.map(processRawTask) : [];

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
      completed: false
    }));

    for (const update of updates) {
      await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('id', update.id);
      // Consider syncing these individual updates if syncCardById is appropriate here
    }

    // Update tasks in memory rather than refetching
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
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    ...STANDARD_QUERY_CONFIG,
  });

  const { mutateAsync: createTaskMutation } = useCreateTask();
  const { mutateAsync: completeTaskMutation } = useCompleteTask();

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      // createTaskMutation returns raw data from Supabase.
      const savedRawTaskData = await createTaskMutation(taskData);
      
      if (savedRawTaskData) {
        // Process the raw data to conform to the Task type.
        const processedTask = processRawTask(savedRawTaskData);
        return processedTask;
      }
      // If createTaskMutation returns null (e.g., on error handled within the mutation),
      // or if no data was returned, propagate null.
      return null;
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
      await saveTasksToDB(updatedTasks); // This should probably use queryClient.setQueryData
      
      // Invalidate and refetch might be better after deletion
      // queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });

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

  const toggleTaskCompletion = async (taskId: string, completed: boolean): Promise<boolean> => {
    try {
      if (completed) {
        await completeTaskMutation({
          taskId,
          updates: {
            completed: true,
            last_completed_date: getLocalDateString(), // Ensure this is in 'YYYY-MM-DD' or compatible format
            updated_at: new Date().toISOString()
          }
        });
      } else {
        await supabase
          .from('tasks')
          .update({ 
            completed: false,
            updated_at: new Date().toISOString() 
          })
          .eq('id', taskId);
        
        await syncCardById(taskId, 'tasks');
      }
      // Consider query invalidation here as well to ensure UI consistency
      // queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
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
