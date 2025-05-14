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
  user_id?: string; // Added user_id
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
  return data || [];
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
        frequency_count: 0,
        usage_data: [] // Added to clear daily tracker circles
      })
      .eq("frequency", "daily")
      .not("last_completed_date", "eq", today)
      .select("id");
    if (error) throw error;
    if (data)
      for (const row of data) await syncCardById(row.id, "tasks");
  } else {
    // weekly = clear usage_data and counters
    const { data, error } = await supabase
      .from("tasks")
      .update({ frequency_count: 0, usage_data: [] })
      .eq("frequency", "weekly")
      .select("id");
    if (error) throw error;
    if (data)
      for (const row of data) await syncCardById(row.id, "tasks");
  }
};

const processTaskFromDb = (task: any): Task => {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    points: task.points,
    completed: task.completed,
    frequency: (task.frequency as string || 'daily') as 'daily' | 'weekly' | 'monthly' | 'one-time',
    frequency_count: task.frequency_count,
    usage_data: Array.isArray(task.usage_data) ? 
      task.usage_data.map((val: any) => Number(val)) : 
      [0, 0, 0, 0, 0, 0, 0],
    icon_url: task.icon_url,
    icon_name: task.icon_name,
    icon_color: task.icon_color,
    highlight_effect: task.highlight_effect,
    title_color: task.title_color,
    subtext_color: task.subtext_color,
    calendar_color: task.calendar_color,
    last_completed_date: task.last_completed_date,
    week_identifier: task.week_identifier,
    created_at: task.created_at,
    updated_at: task.updated_at
  };
};

export const saveTask = async (taskData: Partial<Task>, userId?: string): Promise<Task | null> => {
  let dataToSave: Partial<Task> = { ...taskData };

  if (userId) {
    dataToSave.user_id = userId;
  }

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
    return data;
  } else {
    // Create new task
    // user_id should be set by useCreateTask now, but this provides a fallback if called directly.
    // However, direct calls should be avoided; use the mutation hook.
    const fullTaskData = { ...dataToSave, id: uuidv4() };
     if (!fullTaskData.user_id && userId) { // Ensure user_id if provided and not already set
      fullTaskData.user_id = userId;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(fullTaskData as Task) // Cast as Task, ensure all required fields are present or defaulted by DB
      .select()
      .single();
    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }
    if (data) await syncCardById(data.id, "tasks");
    return data;
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
