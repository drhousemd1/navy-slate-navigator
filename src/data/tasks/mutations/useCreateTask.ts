
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { TaskWithId, CreateTaskVariables, Json } from '@/data/tasks/types';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/contexts/auth';
import { processImageForSave } from '@/utils/image/taskIntegration';

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCreateOptimisticMutation<TaskWithId, Error, CreateTaskVariables>({
    queryClient,
    queryKey: TASKS_QUERY_KEY,
    mutationFn: async (variables: CreateTaskVariables) => {
      // Ensure user is authenticated
      if (!user?.id) {
        throw new Error('User must be authenticated to create tasks');
      }

      // Process image if present
      const { processedUrl, metadata } = await processImageForSave(variables.background_image_url || null);

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
        background_image_url: processedUrl,
        background_opacity: variables.background_opacity || 100,
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x || 50,
        focal_point_y: variables.focal_point_y || 50,
        week_identifier: variables.week_identifier, 
        background_images: variables.background_images as Json,
        icon_url: variables.icon_url,
        image_meta: variables.image_meta || metadata,
        user_id: user.id, // Always use current authenticated user
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
        optimisticId: optimisticId,
        created_at: now,
        updated_at: now,
        completed: false,
        last_completed_date: null,
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
        usage_data: variables.usage_data || Array(7).fill(0),
        background_images: variables.background_images as Json || null,
        image_meta: variables.image_meta || null,
        user_id: user?.id || '',
        ...variables, 
      } as TaskWithId;
    },
    onSuccessCallback: async (newTaskData) => {
      logger.debug('[useCreateTask onSuccessCallback] New task created on server, updating IndexedDB.', newTaskData);
      try {
        const localTasks = await loadTasksFromDB() || [];
        const updatedLocalTasks = [
            newTaskData, 
            ...localTasks.filter(t => 
                t.id !== newTaskData.id && 
                (!newTaskData.optimisticId || t.id !== newTaskData.optimisticId)
            )
        ];
        await saveTasksToDB(updatedLocalTasks);
        await setLastSyncTimeForTasks(new Date().toISOString());
        logger.debug('[useCreateTask onSuccessCallback] IndexedDB updated with new task.');
      } catch (e: unknown) {
        const descriptiveMessage = getErrorMessage(e);
        logger.error('[useCreateTask onSuccessCallback] Error updating IndexedDB:', descriptiveMessage, e);
        toast({ 
            variant: "destructive", 
            title: "Local Save Error", 
            description: `Task created on server, but failed to save locally: ${descriptiveMessage}` 
        });
      }
    },
  });
};
