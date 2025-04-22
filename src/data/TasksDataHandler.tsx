
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  toggleTaskCompletion,
  getTaskCompletions,
  uploadTaskImage
} from '@/services/tasks';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/types/task.types';
import { toast } from '@/hooks/use-toast';

export const TASKS_QUERY_KEY = 'tasks';
export const TASK_COMPLETIONS_QUERY_KEY = 'task-completions';

export const useTasksData = () => {
  const queryClient = useQueryClient();

  // Query for fetching all tasks
  const { 
    data: tasks = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [TASKS_QUERY_KEY],
    queryFn: fetchTasks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating a task
  const createTaskMutation = useMutation({
    mutationFn: (newTask: CreateTaskInput) => createTask(newTask),
    onSuccess: (newTask) => {
      // Update cache optimistically
      queryClient.setQueryData(
        [TASKS_QUERY_KEY],
        (oldData: Task[] = []) => [newTask, ...oldData]
      );
      
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a task
  const updateTaskMutation = useMutation({
    mutationFn: (updatedTask: UpdateTaskInput) => updateTask(updatedTask),
    onMutate: async (updatedTask) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>([TASKS_QUERY_KEY]);
      
      // Optimistically update to the new value
      if (previousTasks) {
        queryClient.setQueryData(
          [TASKS_QUERY_KEY],
          previousTasks.map(task => 
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          )
        );
      }
      
      return { previousTasks };
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData([TASKS_QUERY_KEY], context.previousTasks);
      }
      
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server state
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });

  // Mutation for deleting a task
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });
      
      const previousTasks = queryClient.getQueryData<Task[]>([TASKS_QUERY_KEY]);
      
      if (previousTasks) {
        queryClient.setQueryData(
          [TASKS_QUERY_KEY],
          previousTasks.filter(task => task.id !== taskId)
        );
      }
      
      return { previousTasks };
    },
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData([TASKS_QUERY_KEY], context.previousTasks);
      }
      
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });

  // Mutation for toggling task completion
  const toggleCompletionMutation = useMutation({
    mutationFn: ({ 
      taskId, 
      completed, 
      lastCompletedDate 
    }: { 
      taskId: string; 
      completed: boolean; 
      lastCompletedDate?: string;
    }) => toggleTaskCompletion(taskId, completed, lastCompletedDate),
    onMutate: async ({ taskId, completed, lastCompletedDate }) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });
      
      const previousTasks = queryClient.getQueryData<Task[]>([TASKS_QUERY_KEY]);
      
      if (previousTasks) {
        queryClient.setQueryData(
          [TASKS_QUERY_KEY],
          previousTasks.map(task => {
            if (task.id === taskId) {
              return { 
                ...task, 
                completed, 
                last_completed_date: completed ? (lastCompletedDate || new Date().toISOString()) : task.last_completed_date
              };
            }
            return task;
          })
        );
      }
      
      return { previousTasks };
    },
    onSuccess: (updatedTask) => {
      const action = updatedTask.completed ? "completed" : "marked as incomplete";
      
      toast({
        title: `Task ${action}`,
        description: `"${updatedTask.title}" has been ${action}.`,
      });
      
      // If a task was completed, invalidate the task completions query too
      if (updatedTask.completed) {
        queryClient.invalidateQueries({ queryKey: [TASK_COMPLETIONS_QUERY_KEY] });
      }
    },
    onError: (error: Error, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData([TASKS_QUERY_KEY], context.previousTasks);
      }
      
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });

  // Query for fetching task completions
  const useTaskCompletions = (startDate: Date, endDate: Date) => {
    return useQuery({
      queryKey: [TASK_COMPLETIONS_QUERY_KEY, startDate.toISOString(), endDate.toISOString()],
      queryFn: () => getTaskCompletions(startDate, endDate),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Mutation for uploading a task image
  const uploadImageMutation = useMutation({
    mutationFn: ({ file, taskId }: { file: File; taskId: string }) => 
      uploadTaskImage(file, taskId),
    onSuccess: (imageUrl, { taskId }) => {
      // Update the task with the new image URL
      updateTaskMutation.mutate({ 
        id: taskId, 
        image_url: imageUrl 
      });
      
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    toggleTaskCompletion: toggleCompletionMutation.mutate,
    uploadTaskImage: uploadImageMutation.mutate,
    useTaskCompletions,
  };
};
