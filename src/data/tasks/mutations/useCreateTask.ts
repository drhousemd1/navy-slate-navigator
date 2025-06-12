
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { CreateTaskVariables } from '../types';

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: CreateTaskVariables) => {
      logger.debug('[useCreateTask] Creating task with variables:', variables);

      const taskData = {
        title: variables.title,
        user_id: variables.user_id,
        description: variables.description,
        priority: variables.priority || 'medium',
        frequency: variables.frequency || 'daily',
        frequency_count: variables.frequency_count || 1,
        points: variables.points || 10,
        background_image_url: variables.background_image_url,
        background_opacity: variables.background_opacity ?? 100,
        icon_url: variables.icon_url,
        icon_name: variables.icon_name,
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#7E69AB',
        icon_color: variables.icon_color || '#9b87f5',
        highlight_effect: variables.highlight_effect ?? false,
        focal_point_x: variables.focal_point_x ?? 50,
        focal_point_y: variables.focal_point_y ?? 50,
        usage_data: [0, 0, 0, 0, 0, 0, 0], // Initialize as 7-element array
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        logger.error('[useCreateTask] Error creating task:', error);
        throw error;
      }

      logger.debug('[useCreateTask] Task created successfully:', data);
      return data;
    },
    onSuccess: (newTask) => {
      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return [newTask];
        return [...old, newTask];
      });

      toast({
        title: 'Task created',
        description: `${newTask.title} has been created successfully.`,
      });
    },
    onError: (error) => {
      logger.error('[useCreateTask] Error creating task:', error);
      toast({
        title: 'Error creating task',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
};
