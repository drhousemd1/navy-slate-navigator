
import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, processTasksWithRecurringLogic } from '@/lib/taskUtils'; 
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from './queries/tasks/fetchTasks';
import { useCreateTask } from './tasks/mutations/useCreateTask';
import { useUpdateTask, UpdateTaskVariables } from './tasks/mutations/useUpdateTask';
import { useDeleteTask } from './tasks/mutations/useDeleteTask';
import { CreateTaskVariables } from './tasks/types';
import { useToggleCompletionWorkflowMutation } from './tasks/mutations/useToggleCompletionWorkflowMutation';

export interface TasksDataHook {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  saveTask: (taskData: Partial<Task>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  toggleTaskCompletion: (taskId: string, completed: boolean, points: number) => Promise<boolean>;
  refetchTasks: () => Promise<QueryObserverResult<Task[], Error>>; // This might be removed if not used elsewhere.
}

export const useTasksData = (): TasksDataHook => {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading,
    error,
    refetch: refetchTasks, // Keep refetch for now, though direct cache updates are preferred for mutations
  } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    // staleTime, gcTime etc are now managed by useTasks query hook or global config
  });

  const { mutateAsync: createTaskMutation } = useCreateTask();
  const { mutateAsync: updateTaskMutation } = useUpdateTask();
  const { mutateAsync: deleteTaskMutation } = useDeleteTask();
  const { mutateAsync: toggleCompletionWorkflowMutateAsync } = useToggleCompletionWorkflowMutation();

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      let savedTask: Task | undefined | null = null;
      if (taskData.id) {
        const { id, ...updates } = taskData;
        savedTask = await updateTaskMutation({ 
          id, 
          ...updates 
        } as UpdateTaskVariables);
        // Cache update should be handled by useUpdateTask mutation's onSuccess
        // if (savedTask) {
        //   queryClient.setQueryData<Task[]>(['tasks'], (oldData = []) =>
        //     oldData.map(task => task.id === savedTask!.id ? savedTask! : task)
        //   );
        // }
      } else {
        const { id, created_at, updated_at, completed, last_completed_date, ...creatableDataFields } = taskData;
        
        const variables: CreateTaskVariables = {
          title: creatableDataFields.title || "Default Task Title",
          points: creatableDataFields.points || 0,
          
          description: creatableDataFields.description,
          frequency: creatableDataFields.frequency,
          frequency_count: creatableDataFields.frequency_count,
          priority: creatableDataFields.priority,
          icon_name: creatableDataFields.icon_name,
          icon_color: creatableDataFields.icon_color,
          title_color: creatableDataFields.title_color,
          subtext_color: creatableDataFields.subtext_color,
          calendar_color: creatableDataFields.calendar_color,
          background_image_url: creatableDataFields.background_image_url,
          background_opacity: creatableDataFields.background_opacity,
          highlight_effect: creatableDataFields.highlight_effect,
          focal_point_x: creatableDataFields.focal_point_x,
          focal_point_y: creatableDataFields.focal_point_y,
          icon_url: creatableDataFields.icon_url,
          
          week_identifier: (creatableDataFields as any).week_identifier,
          background_images: (creatableDataFields as any).background_images,
        };
        savedTask = await createTaskMutation(variables);
        // Cache update should be handled by useCreateTask mutation's onSuccess
        // if (savedTask) {
        //   queryClient.setQueryData<Task[]>(['tasks'], (oldData = []) =>
        //     [savedTask!, ...oldData]
        //   );
        // }
      }
      return savedTask || null;
    } catch (e: any) {
      console.error('Error saving task:', e);
      toast({ title: 'Error Saving Task on Page', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      await deleteTaskMutation(taskId);
      // Cache update should be handled by useDeleteTask mutation's onSuccess
      // queryClient.setQueryData<Task[]>(['tasks'], (oldData = []) =>
      //   oldData.filter(task => task.id !== taskId)
      // );
      return true;
    } catch (e: any) {
      console.error('Error deleting task:', e);
      // Toast is often handled by the mutation hook's onError
      return false;
    }
  };

  const toggleTaskCompletion = async (taskId: string, completedParam: boolean, pointsValue: number): Promise<boolean> => {
    try {
      // The useToggleCompletionWorkflowMutation hook should handle its own cache updates (optimistic or on success).
      // No need to get updatedTaskData here if the mutation handles the cache.
      await toggleCompletionWorkflowMutateAsync({ taskId, completed: completedParam, pointsValue });
      
      // Removed manual queryClient.setQueryData calls.
      // The mutation hook (useToggleCompletionWorkflowMutation) is now responsible for updating the cache.

      return true;
    } catch (e: any) {
      console.error('Error during toggleTaskCompletion workflow (TasksDataHandler):', e.message);
      return false;
    }
  };

  return {
    tasks: processTasksWithRecurringLogic(tasks || []),
    isLoading,
    error,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetchTasks,
  };
};

