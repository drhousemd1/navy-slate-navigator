import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getMondayBasedDay } from "./utils";
import { queryClient } from "@/data/queryClient"; 
import { logger } from '@/lib/logger';
import { RawSupabaseTask, Json } from '@/data/tasks/types'; // Import RawSupabaseTask and Json

export interface Task {
  id: string;
  title: string;
  description?: string;
  points: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number; // Max completions per period
  usage_data: number[]; // Completions per day of week (Mon-Sun)
  icon_url?: string;
  icon_name?: string;
  icon_color?: string;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  last_completed_date?: string; // YYYY-MM-DD
  background_images?: Json | null; // Added for consistency
  created_at?: string;
  updated_at?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export const getLocalDateString = (): string => {
  const today = new Date();
  // Format as YYYY-MM-DD
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      logger.error('Error fetching tasks:', error);
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    
    const rawTasks = (data || []) as RawSupabaseTask[];
    const processedTasks = rawTasks.map(processTaskFromDb);
    
    const tasksToReset = processedTasks.filter(task => 
      task.completed && 
      task.frequency === 'daily' && 
      !wasCompletedToday(task)
    );
    
    if (tasksToReset.length > 0) {
      for (const task of tasksToReset) {
        await supabase
          .from('tasks')
          .update({ completed: false })
          .eq('id', task.id);
          
        // Update the local task object
        task.completed = false;
      }
    }
    
    return processedTasks;
  } catch (err: unknown) {
    logger.error('Unexpected error fetching tasks:', err);
    toast({
      title: 'Error fetching tasks',
      description: getErrorMessage(err) || 'Could not fetch tasks',
      variant: 'destructive',
    });
    return [];
  }
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
        // frequency_count should not be reset to 0 for daily tasks here,
        // as it represents max completions, not current.
        // usage_data should be reset for the new day.
        // However, the current logic is to reset tasks not completed *today*.
        // If we clear usage_data, it will affect weekly view.
        // Let's stick to the original intent of resetting 'completed' status.
        // If full reset of daily progress is needed, usage_data handling needs careful consideration.
      })
      .eq("frequency", "daily")
      .not("last_completed_date", "eq", today) // Only reset if not completed today
      .select("id");

    if (error) throw error;
    if (data) {
      for (const row of data) {
        queryClient.invalidateQueries({ queryKey: ['tasks', row.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate the general list
    }
  } else { // weekly
    const { data, error } = await supabase
      .from("tasks")
      .update({ 
        // For weekly, reset usage_data to all zeros.
        // completed status and frequency_count (max) should persist.
        usage_data: Array(7).fill(0) 
      }) 
      .eq("frequency", "weekly")
      .select("id");

    if (error) throw error;
    if (data) {
      for (const row of data) {
        queryClient.invalidateQueries({ queryKey: ['tasks', row.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate the general list
    }
  }
};

export const processTaskFromDb = (task: RawSupabaseTask): Task => {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    points: task.points,
    priority: (task.priority || 'medium') as 'low' | 'medium' | 'high',
    completed: task.completed,
    background_image_url: task.background_image_url ?? undefined,
    background_opacity: task.background_opacity ?? undefined,
    focal_point_x: task.focal_point_x ?? undefined,
    focal_point_y: task.focal_point_y ?? undefined,
    frequency: (task.frequency || 'daily') as 'daily' | 'weekly',
    frequency_count: task.frequency_count || 1,
    usage_data: Array.isArray(task.usage_data) && task.usage_data.length === 7 ? 
      task.usage_data.map((val: any) => Number(val) || 0) : 
      Array(7).fill(0),
    icon_url: task.icon_url ?? undefined,
    icon_name: task.icon_name ?? undefined,
    icon_color: task.icon_color ?? undefined,
    highlight_effect: task.highlight_effect ?? false,
    title_color: task.title_color ?? undefined,
    subtext_color: task.subtext_color ?? undefined,
    calendar_color: task.calendar_color ?? undefined,
    last_completed_date: task.last_completed_date ?? undefined,
    background_images: task.background_images ?? null,
    created_at: task.created_at,
    updated_at: task.updated_at
  };
};

export const processTasksWithRecurringLogic = (rawTasks: RawSupabaseTask[]): Task[] => {
  if (!rawTasks) return [];
  const todayStr = getLocalDateString();
  return rawTasks.map(rawTask => {
    const task = processTaskFromDb(rawTask);

    if (task.frequency === 'daily' && task.completed && task.last_completed_date !== todayStr) {
      return { ...task, completed: false };
    }
    return task;
  });
};

export const saveTask = async (task: Partial<Task>): Promise<Task | null> => {
  try {
    logger.debug('Saving task with highlight effect:', task.highlight_effect);
    logger.debug('Saving task with icon name:', task.icon_name);
    logger.debug('Saving task with icon color:', task.icon_color);
    logger.debug('Saving task with usage_data:', task.usage_data);
    
    const usage_data = task.usage_data || Array(7).fill(0);
    const now = new Date().toISOString();
    
    let supabaseResponse;
    if (task.id) {
      supabaseResponse = await supabase
        .from('tasks')
        .update({
          title: task.title,
          description: task.description,
          points: task.points,
          completed: task.completed,
          frequency: task.frequency,
          frequency_count: task.frequency_count,
          background_image_url: task.background_image_url,
          background_opacity: task.background_opacity,
          icon_url: task.icon_url,
          icon_name: task.icon_name,
          title_color: task.title_color,
          subtext_color: task.subtext_color,
          calendar_color: task.calendar_color,
          highlight_effect: task.highlight_effect,
          focal_point_x: task.focal_point_x,
          focal_point_y: task.focal_point_y,
          priority: task.priority,
          icon_color: task.icon_color,
          last_completed_date: task.last_completed_date,
          usage_data: usage_data,
          background_images: task.background_images, // ensure this is passed
          updated_at: now,
        })
        .eq('id', task.id)
        .select()
        .single();
    } else {
      supabaseResponse = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          points: task.points,
          completed: task.completed ?? false,
          frequency: task.frequency ?? 'daily',
          frequency_count: task.frequency_count ?? 1,
          background_image_url: task.background_image_url,
          background_opacity: task.background_opacity,
          icon_url: task.icon_url,
          icon_name: task.icon_name,
          title_color: task.title_color,
          subtext_color: task.subtext_color,
          calendar_color: task.calendar_color,
          highlight_effect: task.highlight_effect,
          focal_point_x: task.focal_point_x,
          focal_point_y: task.focal_point_y,
          priority: task.priority ?? 'medium',
          icon_color: task.icon_color,
          last_completed_date: null,
          usage_data: usage_data,
          background_images: task.background_images, // ensure this is passed
          created_at: now,
        })
        .select()
        .single();
    }

    const { data, error } = supabaseResponse;
    if (error) throw error;
    return processTaskFromDb(data as RawSupabaseTask); // Process the raw response
  } catch (err: unknown) {
    logger.error('Error saving task:', err);
    toast({
      title: 'Error saving task',
      description: getErrorMessage(err) || 'Could not save task',
      variant: 'destructive',
    });
    return null;
  }
};

export const updateTaskCompletion = async (id: string, completed: boolean): Promise<boolean> => {
  try {
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (taskError) throw taskError;
    
    const task = processTaskFromDb(taskData as RawSupabaseTask); 
    
    if (completed && !canCompleteTask(task)) {
      toast({
        title: 'Maximum completions reached',
        description: 'You have reached the maximum completions for today.',
        variant: 'default',
      });
      return false;
    }
    
    const usage_data = [...task.usage_data]; 
    
    if (completed) {
      const dayOfWeek = getCurrentDayOfWeek(); 
      usage_data[dayOfWeek] = (usage_data[dayOfWeek] || 0) + 1;
      
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      
      if (userId) {
        const { error: historyError } = await supabase.rpc('record_task_completion', {
          task_id_param: id,
          user_id_param: userId
        }) as unknown as { error: Error | null }; 
        
        if (historyError) {
          logger.error('Error recording task completion history:', historyError);
        } else {
          logger.debug('Task completion recorded in history');
        }
      }
    }
    
    const dayOfWeek = getCurrentDayOfWeek();
    const isFullyCompletedToday = usage_data[dayOfWeek] >= (task.frequency_count || 1);
    
    const updatePayload: Partial<Task> & { updated_at: string } = { 
      usage_data,
      updated_at: new Date().toISOString(),
    };

    if (task.frequency === 'daily') {
      updatePayload.completed = isFullyCompletedToday;
      if (completed) { 
         updatePayload.last_completed_date = getLocalDateString();
      }
    } else if (task.frequency === 'weekly') {
      if (completed) {
         updatePayload.last_completed_date = getLocalDateString(); 
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update(updatePayload) 
      .eq('id', id);
    
    if (error) throw error;
    
    if (completed) { 
      try {
        const taskPoints = task.points || 0;
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        
        if (!userId) {
          logger.debug('No authenticated user, skipping points update');
          return true;
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          if (profileError.code === 'PGRST116') { 
            logger.debug('No profile found, creating one with initial points:', taskPoints);
            
            const { error: createError } = await supabase
              .from('profiles')
              .insert([{ id: userId, points: taskPoints, dom_points: 0, updated_at: new Date().toISOString() }]); 
              
            if (createError) {
              logger.error('Error creating profile:', createError);
              return true; 
            }
            
            toast({
              title: 'Points Earned',
              description: `You earned ${taskPoints} points!`,
              variant: 'default',
            });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['rewards-points'] });
            return true;
          }
          
          logger.error('Error fetching profile:', profileError);
          return true; 
        }
        
        const currentPoints = profileData?.points || 0;
        const newPoints = currentPoints + taskPoints;
        logger.debug('Updating profile points from', currentPoints, 'to', newPoints);
        
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: newPoints, updated_at: new Date().toISOString() })
          .eq('id', userId);
          
        if (pointsError) {
          logger.error('Error updating points:', pointsError);
          return true; 
        }
        
        logger.debug('Points updated successfully:', newPoints);
        toast({
          title: 'Points Earned',
          description: `You earned ${taskPoints} points!`,
          variant: 'default',
        });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['rewards-points'] });

      } catch (err: unknown) {
        logger.error('Error handling points:', err);
        toast({
          title: 'Task Completed',
          description: getErrorMessage(err) || 'Task was completed, but there was an issue updating points.',
          variant: 'default',
        });
      }
    }
    
    return true;
  } catch (err: unknown) {
    logger.error('Error updating task completion:', err);
    toast({
      title: 'Error updating task',
      description: getErrorMessage(err) || 'Could not update task completion status',
      variant: 'destructive',
    });
    return false;
  }
};

export const deleteTask = async (taskId: string): Promise<boolean> => {
  logger.debug(`[taskUtils] Deleting task with ID: ${taskId}`);
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    logger.error('[taskUtils] Error deleting task:', error);
    return false; 
  }
  logger.debug(`[taskUtils] Task ${taskId} deleted successfully.`);
  return true;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
