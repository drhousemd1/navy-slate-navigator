import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getLocalDateString, wasCompletedToday } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';

const TASKS_QUERY_KEY = ['tasks'];
const TASK_COMPLETIONS_QUERY_KEY = ['task-completions'];
const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics'];

const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  const tasks: Task[] = data.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    points: task.points,
    priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
    completed: task.completed,
    background_image_url: task.background_image_url,
    background_opacity: task.background_opacity,
    focal_point_x: task.focal_point_x,
    focal_point_y: task.focal_point_y,
    frequency: task.frequency as 'daily' | 'weekly',
    frequency_count: task.frequency_count,
    usage_data: Array.isArray(task.usage_data) 
      ? task.usage_data.map(val => typeof val === 'number' ? val : Number(val)) 
      : [0, 0, 0, 0, 0, 0, 0],
    icon_name: task.icon_name,
    icon_url: task.icon_url,
    icon_color: task.icon_color,
    highlight_effect: task.highlight_effect,
    title_color: task.title_color,
    subtext_color: task.subtext_color,
    calendar_color: task.calendar_color,
    last_completed_date: task.last_completed_date,
    created_at: task.created_at,
    updated_at: task.updated_at
  }));

  const today = getLocalDateString();
  const tasksToReset = tasks.filter(task => 
    task.completed && 
    task.frequency === 'daily' && 
    task.last_completed_date !== today
  );

  if (tasksToReset.length > 0) {
    const updates = tasksToReset.map(task => ({
      id: task.id,
      completed: false
    }));

    for (const update of updates) {
      const { error: resetError } = await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('id', update.id);

      if (resetError) {
        console.error('Error resetting task completion:', resetError);
      }
    }

    const { data: refreshedData, error: refreshError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (refreshError) {
      console.error('Error re-fetching tasks after reset:', refreshError);
      throw refreshError;
    }

    return refreshedData.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      points: task.points,
      priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
      completed: task.completed,
      background_image_url: task.background_image_url,
      background_opacity: task.background_opacity,
      focal_point_x: task.focal_point_x,
      focal_point_y: task.focal_point_y,
      frequency: task.frequency as 'daily' | 'weekly',
      frequency_count: task.frequency_count,
      usage_data: Array.isArray(task.usage_data) 
        ? task.usage_data.map(val => typeof val === 'number' ? val : Number(val)) 
        : [0, 0, 0, 0, 0, 0, 0],
      icon_name: task.icon_name,
      icon_url: task.icon_url,
      icon_color: task.icon_color,
      highlight_effect: task.highlight_effect,
      title_color: task.title_color,
      subtext_color: task.subtext_color,
      calendar_color: task.calendar_color,
      last_completed_date: task.last_completed_date,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));
  }

  return tasks;
};

const saveTaskToDb = async (taskData: Task): Promise<Task> => {
  if (taskData.id) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: taskData.title,
        description: taskData.description,
        points: taskData.points,
        priority: taskData.priority,
        completed: taskData.completed,
        background_image_url: taskData.background_image_url,
        background_opacity: taskData.background_opacity,
        focal_point_x: taskData.focal_point_x,
        focal_point_y: taskData.focal_point_y,
        frequency: taskData.frequency,
        frequency_count: taskData.frequency_count,
        highlight_effect: taskData.highlight_effect,
        title_color: taskData.title_color,
        subtext_color: taskData.subtext_color,
        calendar_color: taskData.calendar_color,
        icon_name: taskData.icon_name,
        icon_url: taskData.icon_url,
        icon_color: taskData.icon_color,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    return {
      ...data,
      priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
      frequency: data.frequency as 'daily' | 'weekly',
      usage_data: Array.isArray(data.usage_data) 
        ? data.usage_data.map(val => typeof val === 'number' ? val : Number(val)) 
        : [0, 0, 0, 0, 0, 0, 0]
    } as Task;
  } else {
    const newTask = {
      title: taskData.title,
      description: taskData.description,
      points: taskData.points,
      priority: taskData.priority || 'medium',
      completed: false,
      background_image_url: taskData.background_image_url,
      background_opacity: taskData.background_opacity || 100,
      focal_point_x: taskData.focal_point_x || 50,
      focal_point_y: taskData.focal_point_y || 50,
      frequency: taskData.frequency || 'daily',
      frequency_count: taskData.frequency_count || 1,
      highlight_effect: taskData.highlight_effect || false,
      title_color: taskData.title_color || '#FFFFFF',
      subtext_color: taskData.subtext_color || '#8E9196',
      calendar_color: taskData.calendar_color || '#7E69AB',
      icon_name: taskData.icon_name,
      icon_url: taskData.icon_url,
      icon_color: taskData.icon_color || '#9b87f5',
      usage_data: Array(7).fill(0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    return {
      ...data,
      priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
      frequency: data.frequency as 'daily' | 'weekly',
      usage_data: Array.isArray(data.usage_data) 
        ? data.usage_data.map(val => typeof val === 'number' ? val : Number(val)) 
        : [0, 0, 0, 0, 0, 0, 0]
    } as Task;
  }
};

const deleteTaskFromDb = async (taskId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }

  return true;
};

const updateTaskCompletionInDb = async (taskId: string, completed: boolean): Promise<boolean> => {
  const today = getLocalDateString();
  
  const { error } = await supabase
    .from('tasks')
    .update({
      completed,
      last_completed_date: completed ? today : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task completion:', error);
    throw error;
  }

  return true;
};

const logTaskCompletionToHistory = async (taskId: string): Promise<void> => {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id || 'anonymous';
  
  const { error } = await supabase
    .from('task_completion_history')
    .insert({
      task_id: taskId,
      completed_at: new Date().toISOString(),
      user_id: userId
    });

  if (error) {
    console.error('Error logging task completion to history:', error);
    throw error;
  }
};

const updateTaskUsageData = async (taskId: string): Promise<void> => {
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('usage_data')
    .eq('id', taskId)
    .single();

  if (taskError) {
    console.error('Error fetching task for usage data update:', taskError);
    throw taskError;
  }

  const currentDay = getMondayBasedDay();
  const currentUsageData = Array.isArray(taskData.usage_data) 
    ? taskData.usage_data 
    : Array(7).fill(0);
    
  const updatedUsageData = [...currentUsageData];
  updatedUsageData[currentDay] = Number(updatedUsageData[currentDay] || 0) + 1;

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      usage_data: updatedUsageData,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  if (updateError) {
    console.error('Error updating task usage data:', updateError);
    throw updateError;
  }
};

export const useTasksData = () => {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading,
    error,
    refetch: refetchTasks
  } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 20,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false
  });

  const saveTaskMutation = useMutation({
    mutationFn: saveTaskToDb,
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      
      if (newTask.id) {
        queryClient.setQueryData<Task[]>(
          TASKS_QUERY_KEY, 
          previousTasks.map(t => 
            t.id === newTask.id 
              ? { ...t, ...newTask, updated_at: new Date().toISOString() } 
              : t
          )
        );
      } else {
        const tempId = `temp-${Date.now()}`;
        const optimisticTask: Task = {
          id: tempId,
          title: newTask.title || 'New Task',
          description: newTask.description || '',
          points: newTask.points || 0,
          priority: newTask.priority || 'medium',
          completed: false,
          background_image_url: newTask.background_image_url,
          background_opacity: newTask.background_opacity || 100,
          focal_point_x: newTask.focal_point_x || 50,
          focal_point_y: newTask.focal_point_y || 50,
          frequency: newTask.frequency || 'daily',
          frequency_count: newTask.frequency_count || 1,
          highlight_effect: newTask.highlight_effect || false,
          title_color: newTask.title_color || '#FFFFFF',
          subtext_color: newTask.subtext_color || '#8E9196',
          calendar_color: newTask.calendar_color || '#7E69AB',
          icon_name: newTask.icon_name,
          icon_url: newTask.icon_url,
          icon_color: newTask.icon_color || '#9b87f5',
          usage_data: Array(7).fill(0),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        queryClient.setQueryData<Task[]>(
          TASKS_QUERY_KEY, 
          [optimisticTask, ...previousTasks]
        );
      }
      
      return { previousTasks };
    },
    onError: (err, newTask, context) => {
      console.error('Error saving task:', err);
      toast({
        title: 'Error',
        description: 'Failed to save task. Please try again.',
        variant: 'destructive',
      });
      
      if (context) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTaskFromDb,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      
      queryClient.setQueryData<Task[]>(
        TASKS_QUERY_KEY, 
        previousTasks.filter(t => t.id !== taskId)
      );
      
      return { previousTasks };
    },
    onError: (err, taskId, context) => {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive',
      });
      
      if (context) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    }
  });

  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      await updateTaskCompletionInDb(taskId, completed);
      
      if (completed) {
        await logTaskCompletionToHistory(taskId);
        await updateTaskUsageData(taskId);
      }
      
      return true;
    },
    onMutate: async ({ taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_COMPLETIONS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      
      const taskToUpdate = previousTasks.find(t => t.id === taskId);
      
      if (taskToUpdate) {
        let updatedUsageData = [...(taskToUpdate.usage_data || Array(7).fill(0))];
        
        if (completed) {
          const currentDay = getMondayBasedDay();
          updatedUsageData[currentDay] = Number(updatedUsageData[currentDay] || 0) + 1;
        }
        
        queryClient.setQueryData<Task[]>(
          TASKS_QUERY_KEY, 
          previousTasks.map(t => 
            t.id === taskId 
              ? { 
                  ...t, 
                  completed, 
                  last_completed_date: completed ? getLocalDateString() : null,
                  usage_data: completed ? updatedUsageData : t.usage_data,
                  updated_at: new Date().toISOString() 
                } 
              : t
          )
        );
      }
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      console.error('Error toggling task completion:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
      
      if (context) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASK_COMPLETIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'points'] });
    }
  });

  return {
    tasks,
    isLoading,
    error,
    saveTask: (taskData: Task) => saveTaskMutation.mutateAsync(taskData),
    deleteTask: (taskId: string) => deleteTaskMutation.mutateAsync(taskId),
    toggleTaskCompletion: (taskId: string, completed: boolean) => 
      toggleTaskCompletionMutation.mutateAsync({ taskId, completed }),
    refetchTasks
  };
};
