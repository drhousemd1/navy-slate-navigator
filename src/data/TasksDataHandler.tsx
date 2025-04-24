import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getLocalDateString, wasCompletedToday } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';

const TASKS_QUERY_KEY = ['tasks'];
const TASK_COMPLETIONS_QUERY_KEY = ['task-completions'];
const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics'];

const fetchTaskCompletions = async () => {
  const { data, error } = await supabase
    .from('task_completion_history')
    .select('*')
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

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
      await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('id', update.id);
    }

    return tasks.map(task => {
      if (tasksToReset.some(resetTask => resetTask.id === task.id)) {
        return { ...task, completed: false };
      }
      return task;
    });
  }

  return tasks;
};

export const useTasksData = () => {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasksQuery
  } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 20,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  const {
    data: taskCompletions = [],
    isLoading: completionsLoading,
    error: completionsError,
    refetch: refetchCompletions
  } = useQuery({
    queryKey: TASK_COMPLETIONS_QUERY_KEY,
    queryFn: fetchTaskCompletions,
    staleTime: 1000 * 60 * 20,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      let optimisticTask: Task;
      
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      
      if (taskData.id) {
        optimisticTask = {
          ...previousTasks.find(t => t.id === taskData.id)!,
          ...taskData,
          updated_at: new Date().toISOString()
        } as Task;
        
        queryClient.setQueryData<Task[]>(
          TASKS_QUERY_KEY,
          previousTasks.map(t => t.id === taskData.id ? optimisticTask : t)
        );
        
        const { data, error } = await supabase
          .from('tasks')
          .update({
            title: taskData.title,
            description: taskData.description,
            points: taskData.points,
            priority: taskData.priority,
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
          queryClient.setQueryData(TASKS_QUERY_KEY, previousTasks);
          throw error;
        }

        return data as Task;
      } else {
        const tempId = `temp-${Date.now()}`;
        optimisticTask = {
          id: tempId,
          title: taskData.title || 'New Task',
          description: taskData.description || '',
          points: taskData.points || 5,
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
        } as Task;
        
        queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, [...previousTasks, optimisticTask]);
        
        const { data, error } = await supabase
          .from('tasks')
          .insert({
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
            usage_data: Array(7).fill(0)
          })
          .select()
          .single();

        if (error) {
          queryClient.setQueryData(TASKS_QUERY_KEY, previousTasks);
          throw error;
        }

        queryClient.setQueryData<Task[]>(
          TASKS_QUERY_KEY, 
          previousTasks.concat([data as Task]).filter(t => t.id !== tempId)
        );

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

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      
      queryClient.setQueryData<Task[]>(
        TASKS_QUERY_KEY,
        previousTasks.filter(t => t.id !== taskId)
      );
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        queryClient.setQueryData(TASKS_QUERY_KEY, previousTasks);
        throw error;
      }

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

  const toggleTaskCompletion = async (taskId: string, completed: boolean): Promise<boolean> => {
    try {
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      
      const dayOfWeek = getMondayBasedDay();
      const usageData = [...task.usage_data];
      
      if (completed) {
        usageData[dayOfWeek] = (usageData[dayOfWeek] || 0) + 1;
      }
      
      const isFullyCompleted = usageData[dayOfWeek] >= (task.frequency_count || 1);
      
      queryClient.setQueryData<Task[]>(
        TASKS_QUERY_KEY,
        previousTasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              completed: isFullyCompleted,
              last_completed_date: completed ? getLocalDateString() : t.last_completed_date,
              usage_data: usageData
            };
          }
          return t;
        })
      );
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: isFullyCompleted,
          last_completed_date: completed ? getLocalDateString() : task.last_completed_date,
          usage_data: usageData
        })
        .eq('id', taskId);

      if (error) {
        queryClient.setQueryData(TASKS_QUERY_KEY, previousTasks);
        throw error;
      }

      if (completed) {
        const taskPoints = task.points || 0;
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        
        if (userId) {
          await supabase
            .from('task_completion_history')
            .insert({
              task_id: taskId,
              completed_at: new Date().toISOString(),
              user_id: userId
            });
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', userId)
            .maybeSingle();
          
          const currentPoints = profileData?.points || 0;
          const newPoints = currentPoints + taskPoints;
          
          await supabase
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', userId);
          
          toast({
            title: 'Points Earned',
            description: `You earned ${taskPoints} points!`,
            variant: 'default',
          });
          
          queryClient.invalidateQueries({ queryKey: ['user-points'] });
        }
      }

      queryClient.invalidateQueries({ queryKey: WEEKLY_METRICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASK_COMPLETIONS_QUERY_KEY });
      
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

  const refetchTasks = async (
    options?: RefetchOptions
  ): Promise<QueryObserverResult<Task[], Error>> => {
    queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TASK_COMPLETIONS_QUERY_KEY });
    return await refetchTasksQuery(options);
  };

  return {
    tasks,
    isLoading: tasksLoading || completionsLoading,
    error: tasksError || completionsError,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetchTasks
  };
};
