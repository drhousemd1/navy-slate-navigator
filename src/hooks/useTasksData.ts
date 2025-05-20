
import { useTasksQuery, TasksQueryResult } from '@/data/tasks/queries';
import { TaskWithId, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types'; // Use TaskWithId and variable types
import { useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskCompletionMutation } from '@/data/tasks/mutations'; // Ensure correct import path
// Removed: import { useToggleTaskCompletionMutation } from '@/data/tasks/mutations'; (duplicate)

export type UseTasksDataResult = {
  tasks: TaskWithId[]; // Use TaskWithId
  isLoading: boolean;
  error: Error | null;
  createTask: (variables: CreateTaskVariables) => Promise<TaskWithId | null>; // Adjusted type
  updateTask: (variables: UpdateTaskVariables) => Promise<TaskWithId | null>; // Adjusted type
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
  }: TasksQueryResult = useTasksQuery();

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

