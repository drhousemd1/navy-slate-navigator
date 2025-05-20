
import { useTasksQuery, TasksQueryResult, useTaskByIdQuery } from '@/data/tasks/queries'; // Added useTaskByIdQuery
import { TaskWithId, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import { useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskCompletionMutation } from '@/data/tasks/mutations';

export type UseTasksDataResult = {
  tasks: TaskWithId[];
  isLoading: boolean;
  error: Error | null;
  createTask: ReturnType<typeof useCreateTask>['mutateAsync'];
  updateTask: ReturnType<typeof useUpdateTask>['mutateAsync'];
  deleteTask: ReturnType<typeof useDeleteTask>['mutateAsync'];
  toggleTaskCompletion: ReturnType<typeof useToggleTaskCompletionMutation>['mutateAsync'];
  refetchTasks: () => void;
  fetchTaskById: (taskId: string) => Promise<TaskWithId | null>; // For fetching single task
  useTaskByIdQuery: typeof useTaskByIdQuery; // Expose the hook itself
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

  // Wrapper for fetchTaskById to be returned by the hook
  const fetchTaskByIdClient = async (taskId: string): Promise<TaskWithId | null> => {
    // This is a direct fetch, not using the query hook here for this specific function
    // For reactive fetching, useTaskByIdQuery should be used in the component
    const queryClient = createTaskMutation.queryClient; // get queryClient from one of the mutations
    const data = await queryClient.fetchQuery<TaskWithId | null, Error, TaskWithId | null, readonly (string | undefined)[]>({
        queryKey: ['tasks', taskId],
        queryFn: () => import('@/data/tasks/queries').then(mod => mod.fetchTaskById(taskId))
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
