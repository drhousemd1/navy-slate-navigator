
import { supabase } from '@/integrations/supabase/client';

export const fetchLightweightTasks = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, image_url, status')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchFullTaskDetails = async (taskId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) throw error;
  return data;
};
