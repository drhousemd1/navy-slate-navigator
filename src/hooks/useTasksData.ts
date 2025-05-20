import { useTasksQuery, TasksQueryResult } from '@/data/tasks/queries'; // Updated import
import { Task } from '@/data/tasks/types';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/data/tasks/mutations';
import { useToggleTaskCompletionMutation } from '@/data/tasks/mutations';

export type UseTasksDataResult = {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  createTask: ReturnType<typeof useCreateTask>['mutateAsync'];
  updateTask: ReturnType<typeof useUpdateTask>['mutateAsync'];
  deleteTask: ReturnType<typeof useDeleteTask>['mutateAsync'];
  toggleTaskCompletion: ReturnType<typeof useToggleTaskCompletionMutation>['mutateAsync'];
  refetchTasks: () => void;
};

export const useTasksData = (): UseTasksDataResult => {
  const { 
    data: tasks = [], 
    isLoading, 
    error,
    refetch: refetchTasks
  }: TasksQueryResult = useTasksQuery(); // Using the new hook

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const toggleTaskCompletionMutation = useToggleTaskCompletionMutation();

  return {
    tasks,
    isLoading,
    error: error || null,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    toggleTaskCompletion: toggleTaskCompletionMutation.mutateAsync,
    refetchTasks,
  };
};
