import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getMondayBasedDay } from "./utils";

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
  last_completed_date?: string;
  usage_data?: number[];
  created_at?: string;
}

export const getLocalDateString = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-CA');
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
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    
    const processedTasks = (data as Task[]).map(task => {
      if (!task.usage_data) {
        task.usage_data = Array(7).fill(0);
      }
      
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
    console.log('Saving task with usage_data:', task.usage_data);
    
    const usage_data = task.usage_data || Array(7).fill(0);
    const now = new Date().toISOString();
    
    if (task.id) {
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
          usage_data: usage_data,
          updated_at: now,
        })
        .eq('id', task.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Task;
    } else {
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
          last_completed_date: null,
          usage_data: usage_data,
          created_at: now,
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
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (taskError) throw taskError;
    
    const task = taskData as Task;
    
    if (completed && !canCompleteTask(task)) {
      toast({
        title: 'Maximum completions reached',
        description: 'You have reached the maximum completions for today.',
        variant: 'default',
      });
      return false;
    }
    
    const usage_data = task.usage_data || Array(7).fill(0);
    
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
          console.error('Error recording task completion history:', historyError);
        } else {
          console.log('Task completion recorded in history');
        }
      }
    }
    
    const dayOfWeek = getCurrentDayOfWeek();
    const isFullyCompleted = usage_data[dayOfWeek] >= (task.frequency_count || 1);
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        completed: isFullyCompleted,
        last_completed_date: completed ? getLocalDateString() : task.last_completed_date,
        usage_data
      })
      .eq('id', id);
    
    if (error) throw error;
    
    if (completed) {
      try {
        const taskPoints = task.points || 0;
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        
        if (!userId) {
          console.log('No authenticated user, skipping points update');
          return true;
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          if (profileError.code === 'PGRST116') {
            console.log('No profile found, creating one with initial points:', taskPoints);
            
            const { error: createError } = await supabase
              .from('profiles')
              .insert([{ id: userId, points: taskPoints }]);
              
            if (createError) {
              console.error('Error creating profile:', createError);
              return true;
            }
            
            toast({
              title: 'Points Earned',
              description: `You earned ${taskPoints} points!`,
              variant: 'default',
            });
            
            return true;
          }
          
          console.error('Error fetching profile:', profileError);
          return true;
        }
        
        const currentPoints = profileData?.points || 0;
        const newPoints = currentPoints + taskPoints;
        console.log('Updating profile points from', currentPoints, 'to', newPoints);
        
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', userId);
          
        if (pointsError) {
          console.error('Error updating points:', pointsError);
          return true;
        }
        
        console.log('Points updated successfully:', newPoints);
        toast({
          title: 'Points Earned',
          description: `You earned ${taskPoints} points!`,
          variant: 'default',
        });
      } catch (err) {
        console.error('Error handling points:', err);
        toast({
          title: 'Task Completed',
          description: 'Task was completed, but there was an issue updating points.',
          variant: 'default',
        });
      }
    }
    
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

export const resetTaskCompletions = async (frequency: 'daily' | 'weekly'): Promise<boolean> => {
  try {
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
