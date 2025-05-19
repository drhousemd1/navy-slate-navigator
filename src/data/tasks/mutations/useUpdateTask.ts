
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
// import { Task } from '@/lib/taskUtils'; // Ensure correct Task import
import { Task, UpdateTaskVariables } from '@/data/tasks/types'; // Use Task from types

export type { UpdateTaskVariables };

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Task, Error, UpdateTaskVariables>({ // Changed TaskWithId to Task
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
      // Ensure the returned data conforms to Task, which includes an 'id'
      return data as Task; // Changed TaskWithId to Task
    },
    entityName: 'Task',
    idField: 'id',
  });
};

