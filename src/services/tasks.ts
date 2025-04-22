
import { supabase } from '@/services/api/supabase';
import { 
  Task, 
  CreateTaskInput,
  UpdateTaskInput, 
  TaskCompletion
} from '@/types/task.types';

// Fetch all tasks for the current user
export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Create a new task
export const createTask = async (taskData: CreateTaskInput): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ ...taskData, user_id: (await supabase.auth.getUser()).data.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Update an existing task
export const updateTask = async ({ id, ...updates }: UpdateTaskInput): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete a task
export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Mark a task as completed (or not completed)
export const toggleTaskCompletion = async (
  id: string, 
  completed: boolean, 
  lastCompletedDate?: string
): Promise<Task> => {
  const updates: Partial<Task> = {
    completed,
    updated_at: new Date().toISOString()
  };
  
  if (completed && lastCompletedDate) {
    updates.last_completed_date = lastCompletedDate;
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Record the completion in the task_completions table if task is being completed
  if (completed) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase
      .from('task_completions')
      .insert([{ 
        task_id: id, 
        user_id: userId 
      }]);
  }
  
  return data;
};

// Get task completions for a specific date range
export const getTaskCompletions = async (
  startDate: Date,
  endDate: Date
): Promise<TaskCompletion[]> => {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString());
  
  if (error) throw error;
  return data || [];
};

// Upload a task image to Supabase Storage
export const uploadTaskImage = async (
  file: File,
  taskId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${taskId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('card_images')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('card_images')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
};
