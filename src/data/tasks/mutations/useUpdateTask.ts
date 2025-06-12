
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { UpdateTaskVariables } from '../types';

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdateTaskVariables) => {
      logger.debug('[useUpdateTask] Updating task with variables:', variables);
      
      const { id, ...updateData } = variables;
      
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('[useUpdateTask] Error updating task:', error);
        throw error;
      }

      logger.debug('[useUpdateTask] Task updated successfully:', data);
      return data;
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return [updatedTask];
        return old.map((task: any) => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });

      toast({
        title: 'Task updated',
        description: `${updatedTask.title} has been updated successfully.`,
      });
    },
    onError: (error) => {
      logger.error('[useUpdateTask] Error updating task:', error);
      toast({
        title: 'Error updating task',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
};
