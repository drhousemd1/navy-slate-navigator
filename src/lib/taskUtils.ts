import { supabase } from '@/integrations/supabase/client';

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  last_completed?: string;
  completion_date?: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data?: {
    current_count: number;
    current_period_start: string;
  };
  background_image_url?: string;
  background_opacity: number;
  background_images?: string[];
  focal_point_x: number;
  focal_point_y: number;
  priority: 'low' | 'medium' | 'high';
  highlight_effect: boolean;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  icon_url?: string;
  icon_name?: string;
  carousel_timer?: number; // Add carousel timer property
}

export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
    return [];
  }
};

export const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
  try {
    if (taskData.id) {
      // Update existing task
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', taskData.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        throw new Error(error.message);
      }
      
      return data;
    } else {
      // Create new task
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw new Error(error.message);
      }

      return data;
    }
  } catch (err) {
    console.error('Failed to save task:', err);
    return null;
  }
};

export const updateTaskCompletion = async (taskId: string, completed: boolean): Promise<boolean> => {
  try {
    const today = getLocalDateString(new Date());
    
    const { data: existingCompletions, error: selectError } = await supabase
      .from('tasks')
      .select('completion_date, last_completed')
      .eq('id', taskId);
    
    if (selectError) {
      console.error('Error checking existing completion:', selectError);
      return false;
    }
    
    const task = existingCompletions ? existingCompletions[0] : null;
    
    if (completed) {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: true,
          last_completed: new Date().toISOString(),
          completion_date: today
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error marking task as complete:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('id', taskId);

      if (error) {
        console.error('Error marking task as incomplete:', error);
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error('Failed to update task completion:', err);
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
      throw new Error(error.message);
    }
    
    return true;
  } catch (err) {
    console.error('Failed to delete task:', err);
    return false;
  }
};

export const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const wasCompletedToday = (task: Task): boolean => {
  if (!task.completion_date) {
    return false;
  }
  
  const today = getLocalDateString(new Date());
  return task.completion_date === today;
};
