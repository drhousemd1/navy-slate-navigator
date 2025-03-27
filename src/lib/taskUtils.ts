
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
  last_completed_date?: string;
  usage_data?: number[];
}

export const getLocalDateString = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-CA');
};

export const wasCompletedToday = (task: Task): boolean => {
  return task.last_completed_date === getLocalDateString();
};

export const getCurrentDayOfWeek = (): number => {
  return new Date().getDay();
};

export const canCompleteTask = (task: Task): boolean => {
  if (task.frequency === 'daily') {
    if (!task.last_completed_date || task.last_completed_date !== getLocalDateString()) {
      return true;
    }
    // Check if we haven't reached the max daily completions yet
    const todayIndex = getCurrentDayOfWeek();
    const todayCompletions = task.usage_data?.[todayIndex] || 0;
    return todayCompletions < (task.frequency_count || 1);
  }
  return true;
};

const initializeUsageDataArray = (task: Task): number[] => {
  return task.usage_data || Array(7).fill(0);
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
          updated_at: new Date().toISOString(),
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
    
    // Check if we can complete the task
    if (completed && !canCompleteTask(task)) {
      toast({
        title: 'Maximum completions reached',
        description: 'You have reached the maximum completions for today.',
        variant: 'default',
      });
      return false;
    }
    
    const usage_data = initializeUsageDataArray(task);
    
    if (completed) {
      const dayOfWeek = getCurrentDayOfWeek();
      usage_data[dayOfWeek] = (usage_data[dayOfWeek] || 0) + 1;
    }
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        completed: completed && usage_data[getCurrentDayOfWeek()] >= (task.frequency_count || 1),
        last_completed_date: completed ? getLocalDateString() : task.last_completed_date,
        frequency_count: task.frequency_count,
        usage_data
      })
      .eq('id', id);
    
    if (error) throw error;
    
    if (completed) {
      // Check if a profile exists first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, points')
        .limit(1);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Create a profile if none exists
        const newProfileId = crypto.randomUUID();
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: newProfileId, points: task.points })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating profile:', createError);
          toast({
            title: 'Error updating points',
            description: 'Your task was completed, but we could not update your points.',
            variant: 'destructive',
          });
          return true; // Return true because the task was still completed
        }
        
        console.log('Created new profile with points:', newProfile.points);
        toast({
          title: 'Points Earned',
          description: `You earned ${task.points} points!`,
          variant: 'default',
        });
        return true;
      }
        
      if (!profilesData || profilesData.length === 0) {
        // Create a new profile with the task points
        const newProfileId = crypto.randomUUID();
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: newProfileId, points: task.points })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating profile:', createError);
          toast({
            title: 'Error updating points',
            description: 'Your task was completed, but we could not create a profile to store your points.',
            variant: 'destructive',
          });
          return true; // Return true because the task was still completed
        }
        
        console.log('Created new profile with points:', newProfile.points);
        toast({
          title: 'Points Earned',
          description: `You earned ${task.points} points!`,
          variant: 'default',
        });
      } else {
        // Update existing profile
        const profile = profilesData[0];
        const newPoints = profile.points + task.points;
        
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', profile.id);
          
        if (pointsError) {
          console.error('Error updating points:', pointsError);
          toast({
            title: 'Error updating points',
            description: 'Your task was completed, but we could not update your points.',
            variant: 'destructive',
          });
        } else {
          console.log('Points updated successfully:', newPoints);
          toast({
            title: 'Points Earned',
            description: `You earned ${task.points} points!`,
            variant: 'default',
          });
        }
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
