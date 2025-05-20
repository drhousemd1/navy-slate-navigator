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

// Import supabase client
import { supabase } from '@/integrations/supabase/client';
