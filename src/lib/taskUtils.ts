import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/hooks/use-toast";
import { getMondayBasedDay } from "./utils";
import { queryClient } from "@/data/queryClient";
import { syncCardById } from "@/data/sync/useSyncManager";

export interface Task {
  id: string;
  title: string;
  description?: string;
  points: number;
  completed: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'one-time';
  frequency_count?: number; // How many times per period (e.g. 3 times a week)
  usage_data?: number[]; // For tracking weekly/monthly progress
  priority?: 'low' | 'medium' | 'high';
  background_image_url?: string;
  background_images?: string[] | null; // For carousel
  carousel_timer?: number; // Seconds per image
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  icon_url?: string;
  icon_name?: string;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  icon_color?: string;
  last_completed_date?: string | null; // Tracks the last completion date
  week_identifier?: string | null; // Tracks completions within a specific week
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export const getLocalDateString = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-CA');
};

export const todayKey = (): string =>
  new Date().toLocaleDateString("en-CA");

export const currentWeekKey = (): string => {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.valueOf() - onejan.valueOf()) / 86400000);
  const weekNo = Math.ceil((dayOfYear + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-${weekNo}`;
};

export const wasCompletedToday = (task: Task): boolean => {
  return task.last_completed_date === getLocalDateString();
};

export const getCurrentDayOfWeek = (): number => {
  return getMondayBasedDay();
};

export const canCompleteTask = (task: Task): boolean => {
  if (!task.frequency_count) {
    return !task.completed;
  }
  
  const todayIndex = getCurrentDayOfWeek();
  const todayCompletions = task.usage_data?.[todayIndex] || 0;
  
  return todayCompletions < (task.frequency_count || 1);
};

const initializeUsageDataArray = (task: Task): number[] => {
  return task.usage_data || Array(7).fill(0);
};

export const fetchTasks = async (): Promise<Task[]> => {
  // RLS will filter by user, no explicit user_id needed in select for fetching owned tasks
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
  return data ? data.map(processTaskFromDb) : [];
};

const processTaskFromDb = (dbTask: any): Task => {
  const validFrequencies: Task['frequency'][] = ['daily', 'weekly', 'monthly', 'one-time'];
  let freq = 'one-time' as Task['frequency'];
  if (dbTask.frequency && validFrequencies.includes(dbTask.frequency as Task['frequency'])) {
    freq = dbTask.frequency as Task['frequency'];
  } else if (dbTask.frequency) {
    console.warn(`Invalid frequency value "${dbTask.frequency}" for task ID ${dbTask.id}. Defaulting to 'one-time'.`);
  }

  let bgImages: string[] | null = null;
  if (Array.isArray(dbTask.background_images)) {
    // Ensure all items in the array are strings
    if (dbTask.background_images.every((item: any) => typeof item === 'string')) {
      bgImages = dbTask.background_images as string[];
    } else {
      console.warn(`Invalid items in background_images for task ID ${dbTask.id}. Expected string array.`, dbTask.background_images);
      // Optionally, filter out non-string items or set to null
      const filteredImages = dbTask.background_images.filter((item: any) => typeof item === 'string');
      if (filteredImages.length > 0) {
        bgImages = filteredImages;
      }
    }
  } else if (dbTask.background_images !== null && dbTask.background_images !== undefined) {
    console.warn(`background_images for task ID ${dbTask.id} is not an array. Received:`, dbTask.background_images);
  }

  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    points: dbTask.points,
    completed: dbTask.completed,
    frequency: freq,
    frequency_count: dbTask.frequency_count,
    usage_data: Array.isArray(dbTask.usage_data)
      ? dbTask.usage_data.map((val: any) => Number(val))
      : Array(7).fill(0), // Default to 7 days for weekly tracking if not provided
    priority: (dbTask.priority as Task['priority']) || 'medium',
    background_image_url: dbTask.background_image_url,
    background_images: bgImages,
    carousel_timer: dbTask.carousel_timer,
    background_opacity: dbTask.background_opacity,
    focal_point_x: dbTask.focal_point_x,
    focal_point_y: dbTask.focal_point_y,
    icon_url: dbTask.icon_url,
    icon_name: dbTask.icon_name,
    icon_color: dbTask.icon_color,
    highlight_effect: dbTask.highlight_effect,
    title_color: dbTask.title_color,
    subtext_color: dbTask.subtext_color,
    calendar_color: dbTask.calendar_color,
    last_completed_date: dbTask.last_completed_date,
    week_identifier: dbTask.week_identifier,
    created_at: dbTask.created_at,
    updated_at: dbTask.updated_at,
    user_id: dbTask.user_id,
  };
};

export const resetTaskCompletions = async (
  frequency: "daily" | "weekly"
): Promise<void> => {
  if (frequency === "daily") {
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from("tasks")
      .update({ 
        completed: false, 
        // DO NOT reset usage_data for daily tasks here if last_completed_date is not today
        // usage_data should reflect actual usage and reset only if it's a new day.
        // This was modified to ensure frequency_count is not reset.
        // The problem might be how `usage_data` is reset globally or per task.
        // For now, we only set completed to false if it's not today.
      })
      .eq("frequency", "daily")
      .not("last_completed_date", "eq", today) // Only reset if not completed today
      .select("id"); // Select id to sync

    if (error) {
        console.error('Error resetting daily task completions:', error);
        throw error;
    }
    if (data) {
      for (const row of data) {
        // Additionally, reset usage_data for these tasks
        await supabase.from("tasks").update({ usage_data: Array(7).fill(0) }).eq('id', row.id);
        await syncCardById(row.id, "tasks");
      }
    }
  } else { // weekly
    // For weekly tasks, reset usage_data. Keep frequency_count.
    const { data, error } = await supabase
      .from("tasks")
      .update({ 
        // frequency_count: 0, // REMOVED: Do not reset the target frequency count
        usage_data: Array(7).fill(0) // Reset usage data to all zeros for weekly tasks
      })
      .eq("frequency", "weekly") // This should target tasks whose week_identifier is not the current week
      .select("id");
    if (error) {
        console.error('Error resetting weekly task completions:', error);
        throw error;
    }
    if (data)
      for (const row of data) await syncCardById(row.id, "tasks");
  }
};

export const saveTask = async (taskData: Partial<Task>, userId?: string): Promise<Task | null> => {
  let dataToSave: Partial<Task> = { ...taskData };

  // Ensure user_id is included if provided and not already on taskData
  if (userId && !dataToSave.user_id) {
    dataToSave.user_id = userId;
  }
  // If taskData comes from the form, background_images might already be string[] or null.
  // Supabase client should handle string[] as jsonb. If it's null, it will be saved as null.

  if (dataToSave.id) {
    // Update existing task
    const { data, error } = await supabase
      .from('tasks')
      .update(dataToSave)
      .eq('id', dataToSave.id)
      .select()
      .single();
    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }
    if (data) await syncCardById(data.id, "tasks");
    return data ? processTaskFromDb(data) : null;
  } else {
    // Create new task
    const fullTaskData: Partial<Task> = { ...dataToSave, id: uuidv4() };
     if (!fullTaskData.user_id && userId) {
      fullTaskData.user_id = userId;
    }
    // Ensure all required fields for 'tasks' table are present or defaulted by DB/trigger
    // The cast to 'Task' implies all required fields are there, or DB handles defaults
    const { data, error } = await supabase
      .from('tasks')
      .insert(fullTaskData as Task)
      .select()
      .single();
    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }
    if (data) await syncCardById(data.id, "tasks");
    return data ? processTaskFromDb(data) : null;
  }
};

export const updateTaskCompletion = async (taskId: string, completed: boolean, userId: string): Promise<boolean> => {
  try {
    // Update the task's completed status and last_completed_date
    const updates: Partial<Task> = {
      completed,
      last_completed_date: completed ? new Date().toISOString() : null,
    };

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (updateError) {
      console.error('Error updating task completion status:', updateError);
      throw updateError;
    }
    
    // Record completion in history via RPC
    // The RPC already handles user_id internally or via parameters
    if (completed) {
        const { error: rpcError } = await supabase.rpc('record_task_completion', {
            task_id_param: taskId,
            user_id_param: userId // Pass userId to the RPC
        });
        if (rpcError) {
            console.error('Error recording task completion:', rpcError);
            // Decide if this should throw or just log
        }
    }
    
    await syncCardById(taskId, "tasks");
    return true;
  } catch (error) {
    console.error('Error in updateTaskCompletion:', error);
    return false;
  }
};

export const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }
    // Also remove from IndexedDB after successful Supabase deletion
    // This part might be handled by query invalidation and refetching strategy with syncManager
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
