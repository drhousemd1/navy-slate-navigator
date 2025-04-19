
import { supabase } from '@/integrations/supabase/client';

export interface Task {
  id: string;
  title: string;
  image_url: string;
  status: string;
}

export const fetchLightweightTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, image_url, status')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchFullTaskDetails = async (taskId: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) throw error;
  return data;
};

// Original exports restored
export const saveTask = async (task: Task): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .upsert(task)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
};

export const updateTaskCompletion = async (taskId: string, completed: boolean): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .update({ status: completed ? 'done' : 'pending' })
    .eq('id', taskId);

  if (error) throw error;
};

export const wasCompletedToday = (task: Task): boolean => {
  // Stubbed logic for testing
  return task.status === 'done';
};
