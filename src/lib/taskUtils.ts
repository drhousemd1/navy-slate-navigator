
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  icon_url?: string;
  icon_name?: string;
  priority?: 'low' | 'medium' | 'high';
  completion_count?: number;
  max_completions?: number;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  icon_color?: string;
  last_completed_date?: string; // Track the local date when task was last completed
}

// Helper function to get today's date in YYYY-MM-DD format in local time zone
export const getLocalDateString = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-CA'); // en-CA produces YYYY-MM-DD format
};

// Helper function to check if a task was completed today
export const wasCompletedToday = (task: Task): boolean => {
  return task.last_completed_date === getLocalDateString();
};

// Helper to check if task can be completed based on frequency
export const canCompleteTask = (task: Task): boolean => {
  if (task.frequency === 'daily') {
    // For daily tasks, check if already completed today
    return !wasCompletedToday(task);
  }
  // For weekly tasks or tasks without frequency, always allow completion
  return true;
};

export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*');
    
    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    
    // Process tasks to determine if they should be marked as incomplete based on local date
    const processedTasks = (data as Task[]).map(task => {
      // If the task was completed, but not today (in user's local time), reset it
      if (task.completed && task.frequency === 'daily' && !wasCompletedToday(task)) {
        return { ...task, completed: false };
      }
      return task;
    });
    
    return processedTasks;
  } catch (err) {
    console.error('Unexpected error fetching tasks:', err);
    toast({
      title: 'Error fetching tasks',
      description: 'Could not fetch tasks',
      variant: 'destructive',
    });
    return [];
  }
};

export const saveTask = async (task: Partial<Task>): Promise<Task | null> => {
  try {
    console.log('Saving task with highlight effect:', task.highlight_effect);
    console.log('Saving task with icon name:', task.icon_name);
    console.log('Saving task with icon color:', task.icon_color);
    
    if (task.id) {
      // Update existing task
      const { data, error } = await supabase
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Task;
    } else {
      // Create new task
      const { data, error } = await supabase
        .from('tasks')
        .insert({
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
          last_completed_date: null, // Initialize as null for new tasks
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Task;
    }
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

export const updateTaskCompletion = async (id: string, completed: boolean): Promise<boolean> => {
  try {
    // First get the current task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (taskError) throw taskError;
    
    const task = taskData as Task;
    
    // If trying to complete a daily task that was already completed today, prevent it
    if (completed && task.frequency === 'daily' && wasCompletedToday(task)) {
      toast({
        title: 'Task already completed',
        description: 'This task has already been completed today.',
        variant: 'default',
      });
      return false;
    }
    
    // Update task with new completion info and last completion date if completed
    const { error } = await supabase
      .from('tasks')
      .update({ 
        completed,
        // Only set last_completed_date if task is being marked as completed
        last_completed_date: completed ? getLocalDateString() : task.last_completed_date,
        // Update frequency count if appropriate
        frequency_count: completed 
          ? (task.frequency_count || 0) + 1 
          : task.frequency_count
      })
      .eq('id', id);
    
    if (error) throw error;
    
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

export const deleteTask = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
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

// Add function to reset completion counts at midnight or week start (for weekly tasks)
export const resetTaskCompletions = async (frequency: 'daily' | 'weekly'): Promise<boolean> => {
  try {
    // For daily tasks, reset all tasks that weren't completed today
    const today = getLocalDateString();
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        completed: false
      })
      .eq('frequency', frequency)
      .not('last_completed_date', 'eq', today);
    
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error('Error resetting task completions:', err);
    toast({
      title: 'Error resetting tasks',
      description: err.message || 'Could not reset task completion status',
      variant: 'destructive',
    });
    return false;
  }
};
