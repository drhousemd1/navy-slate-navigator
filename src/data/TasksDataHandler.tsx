
import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, processTasksWithRecurringLogic } from '@/lib/taskUtils'; 
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from './queries/tasks/fetchTasks';
import { useCreateTask } from './tasks/mutations/useCreateTask';
import { useUpdateTask, UpdateTaskVariables } from './tasks/mutations/useUpdateTask';
import { useDeleteTask } from './tasks/mutations/useDeleteTask';
import { CreateTaskVariables } from './tasks/types'; // Task type from here
import { useToggleCompletionWorkflowMutation } from './tasks/mutations/useToggleCompletionWorkflowMutation';

export interface TasksDataHook {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  saveTask: (taskData: Partial<Task>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  toggleTaskCompletion: (taskId: string, completed: boolean, points: number) => Promise<boolean>;
  refetchTasks: () => Promise<QueryObserverResult<Task[], Error>>;
}

export const useTasksData = (): TasksDataHook => {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading,
    error,
    refetch: refetchTasks,
  } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
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
        // Ensure updates conform to UpdateTaskVariables.
        // Explicitly cast to UpdateTaskVariables if certain fields are not part of Partial<Task>
        // but are on UpdateTaskVariables (e.g. if some fields are Omitted and then re-added as optional)
        // However, with the current setup, Partial<Omit<Task, ...>> should align well.
        savedTask = await updateTaskMutation({ 
          id, 
          ...updates 
        } as UpdateTaskVariables); // Cast for safety if types diverge subtly
      } else {
        // Destructure to ensure only fields belonging to CreateTaskVariables are passed.
        // The type `CreateTaskVariables` is `Omit<Task, "id" | "created_at" | "updated_at" | "completed" | "usage_data" | "last_completed_date">`
        // So, taskData (which is Partial<Task>) needs to be shaped into this.
        
        const { 
          // Fields to omit from taskData before passing to CreateTaskVariables
          id, created_at, updated_at, completed, usage_data, last_completed_date, 
          // Remaining fields are potentially part of CreateTaskVariables
          ...creatableDataFields 
        } = taskData;
        
        const variables: CreateTaskVariables = {
          title: creatableDataFields.title || "Default Task Title", // Required
          points: creatableDataFields.points || 0, // Required
          priority: creatableDataFields.priority || 'medium', // Required
          frequency: creatableDataFields.frequency || 'daily', // Required
          frequency_count: creatableDataFields.frequency_count || 1, // Required
          background_opacity: creatableDataFields.background_opacity || 100, // Required
          focal_point_x: creatableDataFields.focal_point_x || 50, // Required
          focal_point_y: creatableDataFields.focal_point_y || 50, // Required
          icon_color: creatableDataFields.icon_color || '#9b87f5', // Required
          highlight_effect: creatableDataFields.highlight_effect || false, // Required
          title_color: creatableDataFields.title_color || '#FFFFFF', // Required
          subtext_color: creatableDataFields.subtext_color || '#8E9196', // Required
          calendar_color: creatableDataFields.calendar_color || '#7E69AB', // Required

          // Optional fields from Task that are also in CreateTaskVariables
          description: creatableDataFields.description,
          background_image_url: creatableDataFields.background_image_url,
          icon_url: creatableDataFields.icon_url,
          icon_name: creatableDataFields.icon_name,
          week_identifier: creatableDataFields.week_identifier, // Now correctly typed
          background_images: creatableDataFields.background_images, // Now correctly typed
        };
        savedTask = await createTaskMutation(variables);
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
      // queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Handled by optimistic mutation hook
      return true;
    } catch (e: any) {
      console.error('Error deleting task:', e);
      // toast({ title: 'Error Deleting Task', description: e.message, variant: 'destructive' }); // Handled by hook
      return false;
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean, pointsValue: number): Promise<boolean> => {
    try {
      await toggleCompletionWorkflowMutateAsync({ taskId, completed, pointsValue });
      return true;
    } catch (e: any) {
      console.error('Error during toggleTaskCompletion workflow (TasksDataHandler):', e.message);
      // Toast handled by the mutation hook
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

