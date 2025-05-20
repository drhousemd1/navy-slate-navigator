
import { supabase } from '@/integrations/supabase/client';
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { TaskWithId } from './types'; // Use TaskWithId

export const TASKS_QUERY_KEY = ['tasks'];
export const taskQueryKey = (taskId: string) => ['tasks', taskId];

export const fetchTasks = async (): Promise<TaskWithId[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data as TaskWithId[]) || [];
};

export const fetchTaskById = async (taskId: string): Promise<TaskWithId | null> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  
  if (error) throw error;
  return data as TaskWithId | null;
};

export type TasksQueryResult = UseQueryResult<TaskWithId[], Error>; // Use TaskWithId

export function useTasksQuery(options?: { enabled?: boolean }): TasksQueryResult {
  return useQuery<TaskWithId[], Error>({ // Use TaskWithId
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60, 
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,  
    refetchOnMount: true,     
    retry: 1, 
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
    ...(options && { enabled: options.enabled }),
  });
}

