
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Task, Error, string>({
    queryClient,
    queryKey: ['tasks'],
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    entityName: 'Task',
    idField: 'id',
  });
};
