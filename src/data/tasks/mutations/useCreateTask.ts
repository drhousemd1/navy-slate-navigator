
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
import { createTaskDataToLegacyFormat } from '@/utils/image/taskIntegration';

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

      // Convert to legacy format for database insertion
      const legacyData = createTaskDataToLegacyFormat(variables);

      const taskToInsert = {
        title: legacyData.title,
        points: legacyData.points,
        description: legacyData.description,
        frequency: legacyData.frequency || 'daily',
        frequency_count: legacyData.frequency_count || 1,
        priority: legacyData.priority || 'medium',
        icon_name: legacyData.icon_name,
        icon_color: legacyData.icon_color || '#9b87f5',
        title_color: legacyData.title_color || '#FFFFFF',
        subtext_color: legacyData.subtext_color || '#8E9196',
        calendar_color: legacyData.calendar_color || '#7E69AB',
        background_image_url: legacyData.background_image_url,
        background_opacity: legacyData.background_opacity || 100,
        highlight_effect: legacyData.highlight_effect || false,
        focal_point_x: legacyData.focal_point_x || 50,
        focal_point_y: legacyData.focal_point_y || 50,
        week_identifier: legacyData.week_identifier, 
        background_images: legacyData.background_images as Json,
        icon_url: legacyData.icon_url,
        image_meta: legacyData.image_meta as Json,
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
      const legacyData = createTaskDataToLegacyFormat(variables);
      return {
        id: optimisticId,
        optimisticId: optimisticId,
        created_at: now,
        updated_at: now,
        completed: false,
        last_completed_date: null,
        title: legacyData.title,
        points: legacyData.points,
        description: legacyData.description || null,
        frequency: legacyData.frequency || 'daily',
        frequency_count: legacyData.frequency_count || 1,
        priority: legacyData.priority || 'medium',
        icon_name: legacyData.icon_name || null,
        icon_color: legacyData.icon_color || '#9b87f5',
        title_color: legacyData.title_color || '#FFFFFF',
        subtext_color: legacyData.subtext_color || '#8E9196',
        calendar_color: legacyData.calendar_color || '#7E69AB',
        background_image_url: legacyData.background_image_url || null,
        background_opacity: legacyData.background_opacity || 100,
        highlight_effect: legacyData.highlight_effect || false,
        focal_point_x: legacyData.focal_point_x || 50,
        focal_point_y: legacyData.focal_point_y || 50,
        week_identifier: legacyData.week_identifier || null,
        icon_url: legacyData.icon_url || null,
        usage_data: legacyData.usage_data || Array(7).fill(0),
        background_images: legacyData.background_images as Json || null,
        image_meta: legacyData.image_meta as Json || null,
        user_id: user?.id || '',
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
