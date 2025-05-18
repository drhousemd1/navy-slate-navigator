
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Task } from '@/lib/taskUtils'; // Assuming Task is defined here
import { TaskWithId, CreateTaskVariables } from '@/data/tasks/types';

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<TaskWithId, Error, CreateTaskVariables>({
    queryClient,
    queryKey: ['tasks'],
    mutationFn: async (variables: CreateTaskVariables) => {
      // Ensure all required fields for DB insertion are present,
      // relying on DB defaults for fields not in CreateTaskVariables or Task interface.
      const taskToInsert = {
        title: variables.title,
        points: variables.points,
        description: variables.description,
        frequency: variables.frequency || 'daily',
        frequency_count: variables.frequency_count || 1,
        priority: variables.priority || 'medium',
        icon_name: variables.icon_name,
        icon_color: variables.icon_color || '#9b87f5',
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#7E69AB',
        background_image_url: variables.background_image_url,
        background_opacity: variables.background_opacity || 100,
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x || 50,
        focal_point_y: variables.focal_point_y || 50,
        // `completed` and `last_completed_date` will use DB defaults or be set by `toggleTaskCompletion`
        // `created_at` and `updated_at` are handled by DB
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Task creation failed: No data returned.');
      return data as TaskWithId;
    },
    entityName: 'Task',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        completed: false,
        last_completed_date: null,
        // Default values from schema for fields not in variables
        title: variables.title,
        points: variables.points,
        description: variables.description || null,
        frequency: variables.frequency || 'daily',
        frequency_count: variables.frequency_count || 1,
        priority: variables.priority || 'medium',
        icon_name: variables.icon_name || null,
        icon_color: variables.icon_color || '#9b87f5',
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#7E69AB',
        background_image_url: variables.background_image_url || null,
        background_opacity: variables.background_opacity || 100,
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x || 50,
        focal_point_y: variables.focal_point_y || 50,
        week_identifier: variables.week_identifier || null,
        icon_url: variables.icon_url || null, // Assuming Task interface has these
        usage_data: variables.usage_data || [],
        background_images: variables.background_images || null,
        carousel_timer: variables.carousel_timer || null,
        ...variables, // Spread remaining variables
      } as TaskWithId;
    },
  });
};
