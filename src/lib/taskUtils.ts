import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getMondayBasedDay } from "./utils";
import { queryClient } from "@/data/queryClient";
import type { Task, TaskPriority, TaskFrequency } from '@/data/tasks/types'; // UPDATED IMPORT

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
  // This function is also defined in src/data/queries/tasks/fetchTasks.ts
  // It seems redundant here if the other one is primary.
  // For now, assuming this one might be used by older code or specific contexts.
  // If it's truly redundant, it should be removed later.
  // The current error is in src/data/queries/tasks/fetchTasks.ts, so that one will be fixed.
  // This instance of fetchTasks will also use the correct Task type now.
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
    
    const processedTasks = (data || []).map(task => processTaskFromDb(task)); // Ensure processTaskFromDb returns correct Task
    
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

const processTaskFromDb = (task: any): Task => { // Return type is now the imported Task
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    points: task.points,
    priority: (task.priority as string || 'medium') as TaskPriority,
    completed: task.completed,
    background_image_url: task.background_image_url,
    background_opacity: task.background_opacity, // DB is NOT NULL, so this will be a number
    focal_point_x: task.focal_point_x,
    focal_point_y: task.focal_point_y,
    frequency: (task.frequency as string || 'daily') as TaskFrequency,
    frequency_count: task.frequency_count || 1,
    usage_data: Array.isArray(task.usage_data) && task.usage_data.length === 7 ? 
      task.usage_data.map((val: any) => Number(val) || 0) : 
      Array(7).fill(0),
    icon_url: task.icon_url,
    icon_name: task.icon_name,
    icon_color: task.icon_color,
    highlight_effect: task.highlight_effect,
    title_color: task.title_color,
    subtext_color: task.subtext_color,
    calendar_color: task.calendar_color,
    last_completed_date: task.last_completed_date,
    created_at: task.created_at,
    updated_at: task.updated_at,
    week_identifier: task.week_identifier, // Added from canonical Task type
    background_images: task.background_images, // Added from canonical Task type
  };
};

export const saveTask = async (task: Partial<Task>): Promise<Task | null> => {
  console.log('Saving task with highlight effect:', task.highlight_effect);
  console.log('Saving task with icon name:', task.icon_name);
  console.log('Saving task with icon color:', task.icon_color);
  console.log('Saving task with usage_data:', task.usage_data);
    
    const usage_data = task.usage_data || Array(7).fill(0);
    const now = new Date().toISOString();
    
    // Ensure all fields being sent match the DB schema and the Task type from data/tasks/types.ts
    // The Partial<Task> for `task` parameter will now be Partial<CanonicalTask>
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
          week_identifier: task.week_identifier, // Added
          background_images: task.background_images, // Added
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
          // Ensure all required fields from DB are covered.
          // Task type from data/tasks/types.ts will guide this.
          title: task.title, // This is required in DB & Type
          description: task.description,
          points: task.points, // Required
          completed: task.completed ?? false,
          frequency: task.frequency ?? 'daily', // Required
          frequency_count: task.frequency_count ?? 1, // Required
          background_image_url: task.background_image_url,
          background_opacity: task.background_opacity ?? 100, // Required, ensure default if task.background_opacity can be undefined
          icon_url: task.icon_url,
          icon_name: task.icon_name,
          title_color: task.title_color ?? '#FFFFFF', // Required
          subtext_color: task.subtext_color ?? '#8E9196', // Required
          calendar_color: task.calendar_color ?? '#7E69AB', // Required
          highlight_effect: task.highlight_effect ?? false, // Required
          focal_point_x: task.focal_point_x ?? 50, // Required
          focal_point_y: task.focal_point_y ?? 50, // Required
          priority: task.priority ?? 'medium', // Required
          icon_color: task.icon_color ?? '#9b87f5', // Required
          last_completed_date: null,
          usage_data: usage_data,
          created_at: now,
          week_identifier: task.week_identifier, // Added
          background_images: task.background_images, // Added
          // updated_at will be set by default by db or trigger if configured
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
        }) as unknown as { error: Error | null }; // Casting to handle potential Supabase RPC typing
        
        if (historyError) {
          console.error('Error recording task completion history:', historyError);
          // Not throwing, as main task update can still proceed
        } else {
          console.log('Task completion recorded in history');
        }
      }
    }
    
    // Determine if task is fully completed for the day/period based on its own frequency_count
    const dayOfWeek = getCurrentDayOfWeek();
    const isFullyCompletedToday = usage_data[dayOfWeek] >= (task.frequency_count || 1);
    
    const updatePayload: Partial<Task> = {
      usage_data,
      updated_at: new Date().toISOString(),
    };

    if (task.frequency === 'daily') {
      updatePayload.completed = isFullyCompletedToday;
      if (completed) { // Only update last_completed_date if actually marking as completed
         updatePayload.last_completed_date = getLocalDateString();
      }
    } else if (task.frequency === 'weekly') {
      // For weekly tasks, 'completed' might represent if all occurrences for the week are done.
      // This part can be complex. For now, let's assume 'completed' flag is less critical for weekly
      // and usage_data is the primary tracker. If 'completed' should reflect full weekly completion:
      // updatePayload.completed = usage_data.reduce((sum, count) => sum + count, 0) >= (task.frequency_count * 7); // Or similar logic
      // For simplicity, let's not change 'completed' for weekly based on single completion.
      // Or, if 'completed' means "at least one done this week":
      if (completed) {
         updatePayload.last_completed_date = getLocalDateString(); // Mark when last used
      }
    }


    const { error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id);
    
    if (error) throw error;
    
    if (completed) { // Points logic only if a completion happened
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
          if (profileError.code === 'PGRST116') { // Profile does not exist
            console.log('No profile found, creating one with initial points:', taskPoints);
            
            const { error: createError } = await supabase
              .from('profiles')
              .insert([{ id: userId, points: taskPoints, dom_points: 0, updated_at: new Date().toISOString() }]); // Ensure dom_points and updated_at
              
            if (createError) {
              console.error('Error creating profile:', createError);
              // Not returning false, as task completion itself was successful
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
          return true; // Task completion was successful, points issue is secondary
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
          return true; // Task completion successful
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

export const processTasksWithRecurringLogic = (rawTasks: any[]): Task[] => {
  if (!rawTasks) return [];
  const todayStr = getLocalDateString();
  return rawTasks.map(rawTask => {
    const task = processTaskFromDb(rawTask); // Returns canonical Task

    if (task.frequency === 'daily' && task.completed && task.last_completed_date !== todayStr) {
      return { ...task, completed: false };
    }
    return task;
  });
};
