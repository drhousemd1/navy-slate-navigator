import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Task } from '@/lib/taskUtils';
import * as React from 'react';

const TASKS_CACHE_KEY = ['tasks'];

export const useTasksQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading,
    error
  } = useQuery({
    queryKey: TASKS_CACHE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
      
      return (data || []).map(task => ({
        ...task,
        frequency: task.frequency as 'daily' | 'weekly',
        usage_data: Array.isArray(task.usage_data) ? task.usage_data : Array(7).fill(0)
      })) as Task[];
    }
  });

  const saveTask = async (taskData: Task): Promise<Task | null> => {
    try {
      if (!taskData) {
        throw new Error('Task data is required');
      }
  
      const isNewTask = !taskData.id;
      
      const taskToSave = {
        ...taskData,
        updated_at: new Date().toISOString(),
      };
  
      const { data, error } = await supabase
        .from('tasks')
        .upsert(taskToSave, { onConflict: 'id' })
        .select()
        .single();
  
      if (error) {
        throw error;
      }
  
      const typedData = {
        ...data,
        frequency: data.frequency as 'daily' | 'weekly',
        usage_data: Array.isArray(data.usage_data) ? data.usage_data : Array(7).fill(0)
      } as Task;
  
      queryClient.setQueryData<Task[]>(TASKS_CACHE_KEY, (old = []) => {
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
  
      queryClient.setQueryData<Task[]>(TASKS_CACHE_KEY, (old) => {
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
  
      queryClient.setQueryData<Task[]>(TASKS_CACHE_KEY, (old) => {
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
    refreshTasks: () => queryClient.invalidateQueries({ queryKey: TASKS_CACHE_KEY })
  };
};
