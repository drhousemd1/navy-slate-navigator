
import { useCallback } from 'react';
import { useTasksQuery, TasksQueryResult } from '@/data/tasks/queries';
import { TaskWithId, TaskFormValues, CreateTaskVariables, UpdateTaskVariables, Json } from '@/data/tasks/types';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
import { useDeleteTask } from '@/data/tasks/mutations/useDeleteTask'; 
import { logger } from '@/lib/logger';
import { useCreateTask } from '@/data/tasks/mutations/useCreateTask';
import { useUpdateTask } from '@/data/tasks/mutations/useUpdateTask';


// Define a type for the data saveTask might receive
// This will now be more specific: CreateTaskVariables or UpdateTaskVariables
type SaveTaskInput = CreateTaskVariables | UpdateTaskVariables;


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
      // Discriminate between CreateTaskVariables and UpdateTaskVariables
      // UpdateTaskVariables will have an 'id' property.
      if ('id' in taskData && taskData.id) {
        // This is UpdateTaskVariables
        const updatePayload: UpdateTaskVariables = taskData;
        
        // The mutation hook expects UpdateTaskVariables directly.
        // Ensure all fields in taskData (which is TaskFormValues + id)
        // are valid for UpdateTaskVariables.
        // UpdateTaskVariables is { id: string } & Partial<Omit<TaskWithId, ...>>
        // taskData here comes from { ...formData, id: currentTask.id } in Tasks.tsx
        // formData is TaskFormValues.
        // So, we are essentially passing { ...TaskFormValues, id: string }
        // This needs to be compatible with UpdateTaskVariables structure.
        // The useUpdateTask mutationFn maps this correctly.
        
        // We can cast to UpdateTaskVariables if we are sure about the structure from call site
        // Or ensure the mapping logic in useUpdateTask handles the spread from TaskFormValues.
        // For now, assume taskData structure is compatible or useUpdateTask handles it.
        return await updateTaskMutation.mutateAsync(updatePayload);

      } else {
        // This is CreateTaskVariables
        const createPayload: CreateTaskVariables = taskData;
        // The mutation hook expects CreateTaskVariables directly.
        // taskData here comes from { ...formData, usage_data: ..., background_images: ... }
        // formData is TaskFormValues.
        // This structure should be compatible with CreateTaskVariables.
        return await createTaskMutation.mutateAsync(createPayload);
      }
    } catch (e: unknown) {
      let errorMessage = "An error occurred while saving the task.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      logger.error("Error in saveTask (useTasksData):", errorMessage, e);
      toast({ title: "Save Error", description: errorMessage, variant: "destructive" });
      throw e; 
    }
  };

  const deleteTask = async (taskId: string) => {
    return deleteTaskMutation.mutateAsync(taskId);
  };
  
  return {
    tasks,
    isLoading,
    error,
    isUsingCachedData,
    saveTask,
    deleteTask,
    refetch
  };
};
