import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Task } from '@/lib/taskUtils';
import { TaskWithId, UpdateTaskVariables } from '@/data/tasks/types';

export type { UpdateTaskVariables }; // Changed to export type

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<TaskWithId, Error, UpdateTaskVariables>({
    queryClient,
    queryKey: ['tasks'],
    mutationFn: async (variables: UpdateTaskVariables) => {
      const { id, ...updates } = variables;
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Task update failed: No data returned.');
      // Ensure the returned data conforms to TaskWithId, which includes an 'id'
      return data as TaskWithId; 
    },
    entityName: 'Task',
    idField: 'id',
  });
};
