
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryConfig } from './useQueryConfig';
import { Task } from '@/lib/taskUtils';
import * as React from 'react';

const TASKS_CACHE_KEY = 'tasks';

export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Convert the data from Supabase to match the Task type
  return (data || []).map(task => ({
    ...task,
    frequency: task.frequency as 'daily' | 'weekly',
    usage_data: Array.isArray(task.usage_data) ? task.usage_data : Array(7).fill(0)
  })) as Task[];
};

export const useTasksQuery = () => {
  const queryClient = useQueryClient();
  const queryConfig = useQueryConfig<Task[]>([TASKS_CACHE_KEY]);

  const {
    data: tasks = [],
    isLoading,
    error
  } = useQuery({
    ...queryConfig,
    queryKey: [TASKS_CACHE_KEY],
    queryFn: fetchTasks,
    initialData: () => {
      try {
        const cached = localStorage.getItem(TASKS_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            // Make sure we properly cast the data
            return (data || []).map((task: any) => ({
              ...task,
              frequency: task.frequency as 'daily' | 'weekly',
              usage_data: Array.isArray(task.usage_data) ? task.usage_data : Array(7).fill(0)
            })) as Task[];
          }
        }
      } catch (e) {
        console.error('Error loading cached tasks:', e);
      }
      return [];
    },
  });

  React.useEffect(() => {
    if (tasks.length > 0) {
      try {
        localStorage.setItem(
          TASKS_CACHE_KEY,
          JSON.stringify({
            data: tasks,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.error('Error caching tasks:', e);
      }
    }
  }, [tasks]);

  const saveTask = async (taskData: Task): Promise<Task | null> => {
    try {
      if (!taskData) {
        throw new Error('Task data is required');
      }
  
      const isNewTask = !taskData.id;
  
      const { data, error } = await supabase
        .from('tasks')
        .upsert(
          {
            ...taskData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
  
      if (error) {
        throw error;
      }
  
      // Cast the returned data to Task type
      const typedData = {
        ...data,
        frequency: data.frequency as 'daily' | 'weekly',
        usage_data: Array.isArray(data.usage_data) ? data.usage_data : Array(7).fill(0)
      } as Task;
  
      // Optimistically update the cache
      queryClient.setQueryData<Task[]>([TASKS_CACHE_KEY], (old = []) => {
        if (isNewTask) {
          return [typedData, ...old];
        } else {
          return old.map((task) => (task.id === typedData.id ? typedData : task));
        }
      });
  
      toast({
        title: "Success",
        description: `Task ${isNewTask ? 'created' : 'updated'} successfully`,
      });
  
      return typedData;
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const toggleCompletion = async (taskId: string, completed: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', taskId);
  
      if (error) {
        throw error;
      }
  
      // Optimistically update the cache
      queryClient.setQueryData<Task[]>([TASKS_CACHE_KEY], (old) => {
        if (!old) return [];
        return old.map((task) =>
          task.id === taskId ? { ...task, completed } : task
        );
      });
  
      toast({
        title: "Success",
        description: `Task completion toggled successfully`,
      });
    } catch (error) {
      console.error('Error toggling task completion:', error);
      toast({
        title: "Error",
        description: "Failed to toggle task completion. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
  
      if (error) {
        throw error;
      }
  
      // Optimistically update the cache
      queryClient.setQueryData<Task[]>([TASKS_CACHE_KEY], (old) => {
        if (!old) return [];
        return old.filter((task) => task.id !== taskId);
      });
  
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    tasks,
    isLoading,
    error,
    saveTask,
    toggleCompletion,
    deleteTask,
    refreshTasks: () => queryClient.invalidateQueries({ queryKey: [TASKS_CACHE_KEY] })
  };
};
