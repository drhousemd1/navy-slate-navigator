
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../queryClient";
import { supabase } from '@/integrations/supabase/client';
import { Task } from "@/lib/taskUtils";
import { syncCardById } from "@/data/sync/useSyncManager";
import { saveTasksToDB } from "@/data/indexedDB/useIndexedDB";

// Complete a task function
const completeTask = async (taskId: string): Promise<Task> => {
  // First, get the current task data
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
    
  if (fetchError) throw fetchError;
  
  // Update the task in Supabase
  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update({ 
      completed: true,
      updated_at: new Date().toISOString() 
    })
    .eq('id', taskId)
    .select()
    .single();
    
  if (error) throw error;
  
  // Record the completion in task_completion_history
  await supabase.rpc('record_task_completion', {
    task_id_param: taskId,
    user_id_param: (await supabase.auth.getUser()).data.user?.id
  });
  
  // If the task has points, update the user's points
  if (task && task.points > 0) {
    // Get current points
    const { data: userData } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userData.user?.id)
      .single();
      
    const currentPoints = profileData?.points || 0;
    const newPoints = currentPoints + task.points;
    
    // Update the points
    await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userData.user?.id);
      
    // Update points in cache
    queryClient.setQueryData(['points'], newPoints);
  }
  
  return updatedTask as Task;
};

// Hook for completing a task
export function useCompleteTask() {
  return useMutation({
    mutationFn: completeTask,
    onSuccess: (updatedTask) => {
      // Sync the updated task
      syncCardById(updatedTask.id, 'tasks');
      
      // Invalidate related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
    }
  });
}
