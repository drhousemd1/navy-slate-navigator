
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';

export type UpdateTaskVariables = { id: string } & Partial<Omit<Task, 'id'>>;

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Task, Error, UpdateTaskVariables>({
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
      if (!data) throw new Error('Task update failed, no data returned.');
      return data as Task;
    },
    entityName: 'Task',
    idField: 'id',
  });
};
