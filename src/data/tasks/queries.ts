
import { supabase } from '@/integrations/supabase/client';
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Task } from './types'; // Assuming Task type is in ./types or adjust path

// Define query keys for tasks
export const TASKS_QUERY_KEY = ['tasks'];

// You might also have keys for individual tasks, e.g.
export const taskQueryKey = (taskId: string) => ['tasks', taskId];

// Query functions for fetching tasks
export const fetchTasks = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const fetchTaskById = async (taskId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  
  if (error) throw error;
  return data;
};

export type TasksQueryResult = UseQueryResult<Task[], Error>;

export function useTasksQuery(options?: { enabled?: boolean }): TasksQueryResult {
  return useQuery<Task[], Error>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 5, // 5 minutes staleTime
    gcTime: 1000 * 60 * 60, 
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,  
    refetchOnMount: true,     
    retry: 1, 
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
    ...(options && { enabled: options.enabled }),
  });
}

