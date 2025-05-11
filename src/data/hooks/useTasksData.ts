
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { Task } from '@/lib/taskUtils';
import { useTasksQuery } from '../queries/useTasksQuery';
import { useCreateTask } from '../mutations/useCreateTask';
import { useCompleteTask } from '../mutations/useCompleteTask';
import { useReorderTasks } from '../mutations/useReorderTasks';

export function useTasksData() {
  const { data: tasks, isLoading, error, refetch: refetchTasks } = useTasksQuery();
  const createTaskMutation = useCreateTask();
  const completeTaskMutation = useCompleteTask();
  const reorderTasksMutation = useReorderTasks();
  
  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      // This handles both create and update
      const result = await createTaskMutation.mutateAsync(taskData);
      return result;
    } catch (err) {
      console.error('Error in saveTask:', err);
      return null;
    }
  };
  
  const deleteTask = async (taskId: string): Promise<boolean> => {
    // Currently not implemented via mutation
    // This would call a dedicated useDeleteTask mutation hook
    console.error('Delete task not implemented yet');
    return false;
  };
  
  const toggleTaskCompletion = async (taskId: string, completed: boolean): Promise<boolean> => {
    try {
      await completeTaskMutation.mutateAsync({ taskId, completed });
      return true;
    } catch (err) {
      console.error('Error in toggleTaskCompletion:', err);
      return false;
    }
  };
  
  const reorderTasks = async (tasks: Task[], newOrder: string[]): Promise<boolean> => {
    try {
      await reorderTasksMutation.mutateAsync({ tasks, newOrder });
      return true;
    } catch (err) {
      console.error('Error in reorderTasks:', err);
      return false;
    }
  };
  
  return {
    tasks,
    isLoading,
    error,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    reorderTasks,
    refetchTasks
  };
}
