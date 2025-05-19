import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { TaskWithId, CreateTaskVariables } from '@/data/tasks/types';
import { TASKS_QUERY_KEY } from '../queries'; // Corrected import
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<TaskWithId, Error, CreateTaskVariables>({
    queryClient,
    queryKey: TASKS_QUERY_KEY, // Use the constant
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
        week_identifier: variables.week_identifier, 
        background_images: variables.background_images,
        icon_url: variables.icon_url,
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
        icon_url: variables.icon_url || null,
        usage_data: variables.usage_data || Array(7).fill(0), // Default usage_data
        background_images: variables.background_images || null,
        ...variables, // Spread remaining variables
      } as TaskWithId;
    },
    onSuccessCallback: async (newTaskData) => {
      console.log('[useCreateTask onSuccessCallback] New task created on server, updating IndexedDB.', newTaskData);
      try {
        const localTasks = await loadTasksFromDB() || [];
        const updatedLocalTasks = [newTaskData, ...localTasks.filter(t => t.id !== newTaskData.id && t.id !== (newTaskData as any).optimisticId)];
        await saveTasksToDB(updatedLocalTasks);
        await setLastSyncTimeForTasks(new Date().toISOString());
        console.log('[useCreateTask onSuccessCallback] IndexedDB updated with new task.');
      } catch (error) {
        console.error('[useCreateTask onSuccessCallback] Error updating IndexedDB:', error);
        toast({ variant: "destructive", title: "Local Save Error", description: "Task created on server, but failed to save locally." });
      }
    },
  });
};
