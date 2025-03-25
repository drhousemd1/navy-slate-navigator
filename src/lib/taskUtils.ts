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
  priority?: 'low' | 'medium' | 'high';
}

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
    
    return data as Task[];
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
          title_color: task.title_color,
          subtext_color: task.subtext_color,
          calendar_color: task.calendar_color,
          highlight_effect: task.highlight_effect,
          focal_point_x: task.focal_point_x,
          focal_point_y: task.focal_point_y,
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
          title_color: task.title_color,
          subtext_color: task.subtext_color,
          calendar_color: task.calendar_color,
          highlight_effect: task.highlight_effect,
          focal_point_x: task.focal_point_x,
          focal_point_y: task.focal_point_y,
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
    const { error } = await supabase
      .from('tasks')
      .update({ completed })
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
