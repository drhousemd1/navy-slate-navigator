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
        return await updateTaskMutation.mutateAsync(updatePayload);

      } else {
        // This is CreateTaskVariables.
        // The incoming taskData, when 'id' is not present or falsy,
        // is expected to conform to CreateTaskVariables based on how it's constructed
        // (e.g., in Tasks.tsx from TaskFormValues).
        // The 'as CreateTaskVariables' cast assures TypeScript of this specific shape.
        const createPayload: CreateTaskVariables = taskData as CreateTaskVariables;
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
