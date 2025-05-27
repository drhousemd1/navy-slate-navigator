import { useCallback } from 'react'; // useEffect is not directly used here
import { useTasksQuery, TasksQueryResult } from '@/data/tasks/queries';
import { TaskWithId, TaskFormValues, CreateTaskVariables, UpdateTaskVariables, Json } from '@/data/tasks/types'; // Import necessary types
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
// useDeleteTask is imported from data/tasks/mutations now, not data/mutations/tasks
import { useDeleteTask } from '@/data/tasks/mutations/useDeleteTask'; 
// TaskPriority might not be needed if TaskFormValues.priority covers it
// import { TaskPriority } from '@/lib/taskUtils'; 
import { logger } from '@/lib/logger';
import { useCreateTask } from '@/data/tasks/mutations/useCreateTask'; // Import useCreateTask
import { useUpdateTask } from '@/data/tasks/mutations/useUpdateTask'; // Import useUpdateTask


// Define a type for the data saveTask might receive
type SaveTaskInput = (TaskFormValues & { id?: string }) | (TaskWithId & Partial<TaskFormValues>);


export const useTasksData = () => {
  const { 
    data: tasks = [], 
    isLoading, 
    error, 
    refetch,
    isUsingCachedData
  }: TasksQueryResult = useTasksQuery();
  
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTask();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const saveTask = async (taskData: SaveTaskInput): Promise<TaskWithId | null> => {
    try {
      if (taskData.id) {
        // Update existing task
        // Map SaveTaskInput (which includes TaskFormValues fields) to UpdateTaskVariables
        const { id, created_at, updated_at, completed, last_completed_date, usage_data, ...updatePayload } = taskData as TaskWithId & Partial<TaskFormValues>;
        
        const variables: UpdateTaskVariables = {
          id,
          title: updatePayload.title,
          description: updatePayload.description,
          points: updatePayload.points,
          frequency: updatePayload.frequency,
          frequency_count: updatePayload.frequency_count,
          background_image_url: updatePayload.background_image_url,
          background_opacity: updatePayload.background_opacity,
          icon_url: updatePayload.icon_url,
          icon_name: updatePayload.icon_name,
          priority: updatePayload.priority,
          title_color: updatePayload.title_color,
          subtext_color: updatePayload.subtext_color,
          calendar_color: updatePayload.calendar_color,
          icon_color: updatePayload.icon_color,
          highlight_effect: updatePayload.highlight_effect,
          focal_point_x: updatePayload.focal_point_x,
          focal_point_y: updatePayload.focal_point_y,
          // background_images is not part of TaskFormValues, handle if it comes from TaskWithId
          // background_images: 'background_images' in updatePayload ? updatePayload.background_images as Json | null : undefined,
        };
        // Filter out undefined values explicitly if mutation expects only defined fields for partial update
        const definedVariables = Object.fromEntries(Object.entries(variables).filter(([_, v]) => v !== undefined)) as UpdateTaskVariables;

        return await updateTaskMutation.mutateAsync(definedVariables);

      } else {
        // Create new task
        // Map TaskFormValues to CreateTaskVariables
        const createPayload = taskData as TaskFormValues;
        const variables: CreateTaskVariables = {
          title: createPayload.title,
          description: createPayload.description,
          points: createPayload.points,
          frequency: createPayload.frequency,
          frequency_count: createPayload.frequency_count,
          background_image_url: createPayload.background_image_url,
          background_opacity: createPayload.background_opacity,
          icon_url: createPayload.icon_url,
          icon_name: createPayload.icon_name,
          priority: createPayload.priority,
          title_color: createPayload.title_color,
          subtext_color: createPayload.subtext_color,
          calendar_color: createPayload.calendar_color,
          icon_color: createPayload.icon_color,
          highlight_effect: createPayload.highlight_effect,
          focal_point_x: createPayload.focal_point_x,
          focal_point_y: createPayload.focal_point_y,
          // background_images is not part of TaskFormValues, set to null or handle as needed
          background_images: null, 
          usage_data: Array(7).fill(0), // Default usage_data for new tasks
        };
        return await createTaskMutation.mutateAsync(variables);
      }
    } catch (err) {
      logger.error("Error in saveTask (useTasksData):", err);
      // Toasting for errors is typically handled by the mutation hooks themselves (onErorr)
      // or by the component calling saveTask if needed.
      throw err; // Re-throw to be caught by the calling component if necessary
    }
  };

  const deleteTask = async (taskId: string) => {
    return deleteTaskMutation.mutateAsync(taskId);
  };

  // toggleTaskCompletion is handled by useToggleTaskCompletionMutation directly in Tasks.tsx
  // So, it can be removed from here if not used elsewhere via this hook.
  // For now, keeping it as it was in the original file.
  const toggleTaskCompletion = async (taskId: string, completed: boolean, points: number = 0) => {
    try {
      // Update the local cache optimistically first
      queryClient.setQueryData<TaskWithId[]>(["tasks"], oldTasks => {
        if (!oldTasks) return [];
        const updatedTasks = oldTasks.map(t => 
          t.id === taskId ? { ...t, completed } : t
        );
        saveTasksToDB(updatedTasks); // Update IndexedDB
        return updatedTasks;
      });

      // Then update the database
      const { error: toggleError } = await supabase
        .from("tasks")
        .update({ completed, last_completed_date: completed ? new Date().toISOString() : null })
        .eq("id", taskId);

      if (toggleError) {
        logger.error("Error updating task completion:", toggleError);
        
        queryClient.setQueryData<TaskWithId[]>(["tasks"], oldTasks => {
          if (!oldTasks) return [];
          const revertedTasks = oldTasks.map(t => 
            t.id === taskId ? { ...t, completed: !completed, last_completed_date: !completed ? new Date().toISOString() : null } : t
          );
          saveTasksToDB(revertedTasks);
          return revertedTasks;
        });
        
        toast({
          title: 'Error',
          description: 'Failed to update task completion status: ' + toggleError.message,
          variant: 'destructive',
        });
        throw toggleError;
      }

      if (completed) {
        try {
          const userResult = await supabase.auth.getUser();
          const userId = userResult.data.user?.id;
          if (!userId) throw new Error("User not authenticated for recording completion.");

          await supabase.rpc('record_task_completion', { 
            task_id_param: taskId,
            user_id_param: userId 
          });
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', userId)
            .single();
            
          if (profile) {
            await supabase
              .from('profiles')
              .update({ points: (profile.points || 0) + points })
              .eq('id', userId);
          }
          
          toast({
            title: 'Task Completed',
            description: `You earned ${points} points!`,
          });
        } catch (err) {
          logger.error("Error recording task completion or updating points:", err);
          toast({
            title: 'Points Update Issue',
            description: 'Task marked complete, but there was an issue updating your points.',
            variant: 'default',
          });
        }
      } else {
         // Task marked as not completed, potentially remove points if that's the logic
        toast({
          title: 'Task Incomplete',
          description: 'Task marked as not completed.',
        });
      }

      return true;
    } catch (err) {
      logger.error("Error in toggleTaskCompletion:", err);
      return false;
    }
  };


  return {
    tasks,
    isLoading,
    error,
    isUsingCachedData,
    saveTask,
    deleteTask,
    toggleTaskCompletion, // Keep if used, otherwise consider removing if direct mutation usage is preferred
    refetch
  };
};
