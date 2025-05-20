
import { useQueryClient } from "@tanstack/react-query"; 
import { useTasksQuery, TasksQueryResult, useTaskByIdQuery, fetchTaskById } from '@/data/tasks/queries'; 
import { TaskWithId, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import { useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskCompletionMutation } from '@/data/tasks/mutations';
// Assuming OptimisticMutationContext is a general type or defined elsewhere.
// For this fix, specific context types are handled in their respective mutation hooks.

export type UseTasksDataResult = {
  tasks: TaskWithId[];
  isLoading: boolean;
  error: Error | null;
  createTask: ReturnType<typeof useCreateTask>['mutateAsync'];
  updateTask: ReturnType<typeof useUpdateTask>['mutateAsync'];
  deleteTask: ReturnType<typeof useDeleteTask>['mutateAsync'];
  toggleTaskCompletion: ReturnType<typeof useToggleTaskCompletionMutation>['mutateAsync'];
  refetchTasks: () => void;
  fetchTaskById: (taskId: string) => Promise<TaskWithId | null>; 
  useTaskByIdQuery: typeof useTaskByIdQuery; 
};

export const useTasksData = (): UseTasksDataResult => {
  const queryClientHook = useQueryClient(); // Get queryClient from the hook

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

  const fetchTaskByIdClient = async (taskId: string): Promise<TaskWithId | null> => {
    // Corrected: Use queryClientHook obtained from useQueryClient()
    const data = await queryClientHook.fetchQuery<TaskWithId | null, Error, TaskWithId | null, readonly (string | undefined)[]>({ 
        queryKey: ['tasks', taskId],
        queryFn: () => fetchTaskById(taskId) // Directly use imported fetchTaskById
    });
    return data;
  };

  return {
    tasks,
    isLoading,
    error: error || null,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    toggleTaskCompletion: toggleTaskCompletionMutation.mutateAsync,
    refetchTasks,
    fetchTaskById: fetchTaskByIdClient,
    useTaskByIdQuery: useTaskByIdQuery,
  };
};

