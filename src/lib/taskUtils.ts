import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getMondayBasedDay } from "./utils";
import { queryClient } from "@/data/queryClient";
import type { Task, TaskPriority, TaskFrequency } from '@/data/tasks/types';

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
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    
    const processedTasks = (data || []).map(task => processTaskFromDb(task));
    
    const tasksToReset = processedTasks.filter(task => 
      task.frequency === 'daily' && // only reset daily tasks here
      task.completed && 
      !wasCompletedToday(task)
    );
    
    if (tasksToReset.length > 0) {
      const updates = tasksToReset.map(task =>
        supabase
          .from('tasks')
          .update({ completed: false, last_completed_date: null }) // Also reset last_completed_date
          .eq('id', task.id)
      );
      await Promise.all(updates);
          
      // Update the local task objects
      tasksToReset.forEach(task => {
        const originalTask = processedTasks.find(pt => pt.id === task.id);
        if (originalTask) {
          originalTask.completed = false;
          originalTask.last_completed_date = null;
        }
      });
    }
    
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

export const resetTaskCompletions = async (
  frequency: "daily" | "weekly"
): Promise<void> => {
  if (frequency === "daily") {
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from("tasks")
      .update({ 
        completed: false, 
      })
      .eq("frequency", "daily")
      .not("last_completed_date", "eq", today) 
      .select("id");

    if (error) throw error;
    if (data) {
      for (const row of data) {
        queryClient.invalidateQueries({ queryKey: ['tasks', row.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); 
    }
  } else { // weekly
    const { data, error } = await supabase
      .from("tasks")
      .update({ 
        usage_data: Array(7).fill(0) 
      }) 
      .eq("frequency", "weekly")
      .select("id");

    if (error) throw error;
    if (data) {
      for (const row of data) {
        queryClient.invalidateQueries({ queryKey: ['tasks', row.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); 
    }
  }
};

const processTaskFromDb = (task: any): Task => {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    points: task.points,
    priority: (task.priority || 'medium') as TaskPriority,
    completed: task.completed,
    background_image_url: task.background_image_url,
    background_opacity: task.background_opacity ?? 100,
    focal_point_x: task.focal_point_x ?? 50,
    focal_point_y: task.focal_point_y ?? 50,
    frequency: (task.frequency || 'daily') as TaskFrequency,
    frequency_count: task.frequency_count || 1,
    usage_data: Array.isArray(task.usage_data) && task.usage_data.length === 7 ? 
      task.usage_data.map((val: any) => Number(val) || 0) : 
      Array(7).fill(0),
    icon_url: task.icon_url,
    icon_name: task.icon_name,
    icon_color: task.icon_color || '#9b87f5',
    highlight_effect: task.highlight_effect ?? false,
    title_color: task.title_color || '#FFFFFF',
    subtext_color: task.subtext_color || '#8E9196',
    calendar_color: task.calendar_color || '#7E69AB',
    last_completed_date: task.last_completed_date,
    created_at: task.created_at,
    updated_at: task.updated_at,
    week_identifier: task.week_identifier,
    background_images: task.background_images,
  };
};

export const saveTask = async (task: Partial<Task>): Promise<Task | null> => {
  try {
    console.log('Saving task with highlight effect:', task.highlight_effect);
    console.log('Saving task with icon name:', task.icon_name);
    console.log('Saving task with icon color:', task.icon_color);
    console.log('Saving task with usage_data:', task.usage_data);
    
    const usage_data = task.usage_data && task.usage_data.length === 7 ? task.usage_data : Array(7).fill(0);
    const now = new Date().toISOString();
    
    const commonData = {
      title: task.title,
      description: task.description,
      points: task.points,
      priority: task.priority,
      completed: task.completed ?? false, // Default completed to false if undefined
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
      icon_color: task.icon_color,
      last_completed_date: task.last_completed_date,
      usage_data: usage_data,
      week_identifier: task.week_identifier,
      background_images: task.background_images,
    };

    if (task.id) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...commonData, updated_at: now })
        .eq('id', task.id)
        .select()
        .single();
      
      if (error) throw error;
      return processTaskFromDb(data);
    } else {
      const insertData: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { created_at?: string } = {
        title: task.title || "Untitled Task",
        description: task.description,
        points: task.points || 0,
        priority: task.priority || 'medium',
        completed: task.completed ?? false, // Critical: ensure completed is set for new tasks
        frequency: task.frequency || 'daily',
        frequency_count: task.frequency_count || 1,
        background_opacity: task.background_opacity ?? 100,
        focal_point_x: task.focal_point_x ?? 50,
        focal_point_y: task.focal_point_y ?? 50,
        icon_color: task.icon_color || '#9b87f5',
        highlight_effect: task.highlight_effect ?? false,
        title_color: task.title_color || '#FFFFFF',
        subtext_color: task.subtext_color || '#8E9196',
        calendar_color: task.calendar_color || '#7E69AB',
        usage_data: usage_data, // Ensure this is initialized
        background_image_url: task.background_image_url,
        icon_url: task.icon_url,
        icon_name: task.icon_name,
        last_completed_date: task.last_completed_date,
        week_identifier: task.week_identifier,
        background_images: task.background_images,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return processTaskFromDb(data);
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
    
    const task = processTaskFromDb(taskData); // Process to ensure type conformity
    
    if (completed && !canCompleteTask(task)) {
      toast({
        title: 'Maximum completions reached',
        description: 'You have reached the maximum completions for today.',
        variant: 'default',
      });
      return false;
    }
    
    const usage_data = [...task.usage_data]; // Create a mutable copy
    
    if (completed) {
      const dayOfWeek = getCurrentDayOfWeek(); // 0 for Monday, 6 for Sunday
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
    const isFullyCompletedToday = usage_data[dayOfWeek] >= (task.frequency_count || 1);
    
    const updatePayload: Partial<Task> = {
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
              .insert([{ id: userId, points: taskPoints, dom_points: 0, updated_at: new Date().toISOString() }]); 
              
            if (createError) {
              console.error('Error creating profile:', createError);
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
          
          console.error('Error fetching profile:', profileError);
          return true;
        }
        
        const currentPoints = profileData?.points || 0;
        const newPoints = currentPoints + taskPoints;
        console.log('Updating profile points from', currentPoints, 'to', newPoints);
        
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: newPoints, updated_at: new Date().toISOString() })
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
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['rewards-points'] });

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

export const deleteTask = async (taskId: string): Promise<boolean> => {
  console.log(`[taskUtils] Deleting task with ID: ${taskId}`);
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('[taskUtils] Error deleting task:', error);
    return false; 
  }
  console.log(`[taskUtils] Task ${taskId} deleted successfully.`);
  return true;
};

export const processTasksWithRecurringLogic = (rawTasks: Task[]): Task[] => { // Ensure input type is Task[]
  if (!rawTasks) return [];
  const todayStr = getLocalDateString();
  return rawTasks.map(task => { // task is already of type Task here
    // const task = processTaskFromDb(rawTask); // No longer needed if rawTasks are already Task[]

    if (task.frequency === 'daily' && task.completed && task.last_completed_date !== todayStr) {
      return { ...task, completed: false };
    }
    return task;
  });
};
