/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, QueryObserverResult, RefetchOptions, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getLocalDateString, getCurrentDayOfWeek } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { useCreateTask } from "@/data/mutations/useCreateTask";
import { useCompleteTask } from "@/data/mutations/useCompleteTask";
import { saveTasksToDB } from "@/data/indexedDB/useIndexedDB";
import { syncCardById } from "@/data/sync/useSyncManager";

const TASKS_QUERY_KEY = ['tasks'];

const processRawTask = (rawTask: any): Task => {
  // Validate and process frequency
  const validFrequencies: Task['frequency'][] = ['daily', 'weekly', 'monthly', 'one-time'];
  let freq: Task['frequency'] = 'one-time'; // Default frequency
  if (rawTask.frequency && validFrequencies.includes(rawTask.frequency as Task['frequency'])) {
    freq = rawTask.frequency as Task['frequency'];
  } else if (rawTask.frequency) {
    console.warn(`[TasksDataHandler] Invalid frequency value "${rawTask.frequency}" for task ID ${rawTask.id}. Defaulting to 'one-time'.`);
  }

  // Validate and process background_images
  let bgImages: string[] | null = null;
  if (Array.isArray(rawTask.background_images)) {
    if (rawTask.background_images.every((item: any) => typeof item === 'string')) {
      bgImages = rawTask.background_images as string[];
    } else {
      console.warn(`[TasksDataHandler] Invalid items in background_images for task ID ${rawTask.id}.`);
      const filteredImages = rawTask.background_images.filter((item: any) => typeof item === 'string');
      if (filteredImages.length > 0) {
        bgImages = filteredImages;
      }
    }
  }

  // Process frequency_count - make sure it's a positive number or default to 1
  const frequencyCount = typeof rawTask.frequency_count === 'number' ? 
    Math.max(1, rawTask.frequency_count) : // Ensure minimum of 1 if it's a number
    1; // Default to 1 if not a number

  // Process usage_data - ensure it's an array of 7 values for days of the week
  let usageData = Array(7).fill(0); // Default to array of 7 zeros
  
  if (Array.isArray(rawTask.usage_data)) {
    // If there's existing data, map it to numbers
    const processedUsageData = rawTask.usage_data.map((val: any) => {
      if (typeof val === 'number') return val;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    });
    
    // Fill up to 7 days
    for (let i = 0; i < Math.min(processedUsageData.length, 7); i++) {
      usageData[i] = processedUsageData[i];
    }
  }

  console.log(`[TasksDataHandler] Processing task "${rawTask.title}" with frequency=${freq}, frequency_count=${frequencyCount}, usage_data=`, usageData);

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
    frequency_count: frequencyCount, // Use processed value
    usage_data: usageData, // Use processed usage_data
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
  const queryClient = useQueryClient();
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
      // Make sure frequency_count is a positive number
      if (taskData.frequency_count !== undefined) {
        taskData.frequency_count = Math.max(1, taskData.frequency_count);
      }
      
      // Initialize usage_data if not set and task is recurring
      if ((taskData.frequency === 'daily' || taskData.frequency === 'weekly') && !taskData.usage_data) {
        taskData.usage_data = Array(7).fill(0);
      }
      
      const savedRawTaskData = await createTaskMutation(taskData);
      
      if (savedRawTaskData) {
        // Process the raw data to conform to the Task type
        const processedTask = processRawTask(savedRawTaskData);
        return processedTask;
      }
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
      await saveTasksToDB(updatedTasks);
      
      // Always invalidate queries after deletion
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });

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
      console.log(`[TasksDataHandler] toggleTaskCompletion called for task ${taskId}, setting to ${completed}`);
      
      // First, get the current task
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`[TasksDataHandler] Task not found with ID: ${taskId}`);
        return false;
      }
      
      console.log(`[TasksDataHandler] Found task: "${task.title}", frequency=${task.frequency}, frequency_count=${task.frequency_count}`);
      console.log(`[TasksDataHandler] Current usage_data:`, task.usage_data);

      // Handle different task types correctly
      if (task.frequency === 'daily' || task.frequency === 'weekly') {
        // For recurring tasks, we need to update the usage_data array
        const todayIndex = getCurrentDayOfWeek();
        const maxCompletions = Math.max(1, task.frequency_count || 1); // Ensure minimum value of 1
        
        // Clone the usage_data array to avoid direct modification
        const newUsageData = [...(task.usage_data || Array(7).fill(0))];
        
        // If completing, increment the count for today (up to max)
        if (completed) {
          const currentCompletions = newUsageData[todayIndex] || 0;
          // Only increment if not already at max
          if (currentCompletions < maxCompletions) {
            newUsageData[todayIndex] = currentCompletions + 1;
            const newCompletionCount = newUsageData[todayIndex];
            console.log(`[TasksDataHandler] Incrementing completions for day ${todayIndex} from ${currentCompletions} to ${newCompletionCount}`);
            
            // Check if we've reached the max completions for the day
            const isFullyCompleted = newCompletionCount >= maxCompletions;
            
            // Update task in Supabase with the new usage_data
            await completeTaskMutation({
              taskId,
              updates: {
                usage_data: newUsageData,
                completed: isFullyCompleted, // Mark as completed only if max reached
                last_completed_date: getLocalDateString(),
                updated_at: new Date().toISOString()
              }
            });
            
            // Immediately invalidate the query to refetch fresh data
            queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
            return true;
          } else {
            console.log(`[TasksDataHandler] Task already completed maximum times for today: ${currentCompletions}/${maxCompletions}`);
            return false;
          }
        } else {
          // If un-completing, decrement the count for today (not below 0)
          const currentCompletions = newUsageData[todayIndex] || 0;
          if (currentCompletions > 0) {
            newUsageData[todayIndex] = currentCompletions - 1;
            console.log(`[TasksDataHandler] Decrementing completions for day ${todayIndex} from ${currentCompletions} to ${newUsageData[todayIndex]}`);
            
            // Always mark as not completed when decrementing
            await completeTaskMutation({
              taskId,
              updates: { 
                usage_data: newUsageData,
                completed: false,
                updated_at: new Date().toISOString() 
              }
            });
            
            // Immediately invalidate the query to refetch fresh data
            queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
            return true;
          } else {
            console.log(`[TasksDataHandler] Can't decrement - already at 0 completions for day ${todayIndex}`);
            return false;
          }
        }
      } else {
        // For one-time tasks, simply toggle the completed flag
        console.log(`[TasksDataHandler] Handling one-time task completion, setting completed=${completed}`);
        
        if (completed) {
          await completeTaskMutation({
            taskId,
            updates: {
              completed: true,
              last_completed_date: getLocalDateString(),
              updated_at: new Date().toISOString()
            }
          });
        } else {
          await completeTaskMutation({
            taskId,
            updates: { 
              completed: false,
              updated_at: new Date().toISOString() 
            }
          });
        }
        
        // Always invalidate query to refresh UI
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        return true;
      }
    } catch (err: any) {
      console.error('[TasksDataHandler] Error updating task completion:', err);
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
