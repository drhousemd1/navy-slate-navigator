import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/data/tasks/types'; // CORRECTED IMPORT FOR Task type
import { processTasksWithRecurringLogic } from '@/lib/taskUtils'; // Keep for the function
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from './queries/tasks/fetchTasks';
import { useCreateTask } from './tasks/mutations/useCreateTask';
import { useUpdateTask, UpdateTaskVariables } from './tasks/mutations/useUpdateTask';
import { useDeleteTask } from './tasks/mutations/useDeleteTask';
import type { CreateTaskVariables } from './tasks/types'; // Task type from here
import { useToggleCompletionWorkflowMutation } from './tasks/mutations/useToggleCompletionWorkflowMutation';

export interface TasksDataHook {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  saveTask: (taskData: Partial<Task>) => Promise<Task | null>; // Partial<Task> will now use the correct Task
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
  } = useQuery<Task[], Error>({ // Task[] will use the correct Task
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const { mutateAsync: createTaskMutation } = useCreateTask();
  const { mutateAsync: updateTaskMutation } = useUpdateTask();
  const { mutateAsync: deleteTaskMutation } = useDeleteTask();
  const { mutateAsync: toggleCompletionWorkflowMutateAsync } = useToggleCompletionWorkflowMutation();

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => { // taskData is Partial<CorrectTask>
    try {
      let savedTask: Task | undefined | null = null;
      if (taskData.id) {
        const { id, ...updates } = taskData;
        savedTask = await updateTaskMutation({ 
          id, 
          ...updates 
        } as UpdateTaskVariables);
      } else {
        const { 
          id, created_at, updated_at, completed, usage_data, last_completed_date, 
          ...creatableDataFields // This will now correctly include week_identifier and background_images if present in taskData
        } = taskData;
        
        // CreateTaskVariables is Omit<CorrectTask, ...>, so it includes week_identifier and background_images
        const variables: CreateTaskVariables = {
          title: creatableDataFields.title || "Default Task Title", 
          points: creatableDataFields.points || 0, 
          priority: creatableDataFields.priority || 'medium', 
          frequency: creatableDataFields.frequency || 'daily', 
          frequency_count: creatableDataFields.frequency_count || 1, 
          background_opacity: creatableDataFields.background_opacity || 100, 
          focal_point_x: creatableDataFields.focal_point_x || 50, 
          focal_point_y: creatableDataFields.focal_point_y || 50, 
          icon_color: creatableDataFields.icon_color || '#9b87f5', 
          highlight_effect: creatableDataFields.highlight_effect || false, 
          title_color: creatableDataFields.title_color || '#FFFFFF', 
          subtext_color: creatableDataFields.subtext_color || '#8E9196', 
          calendar_color: creatableDataFields.calendar_color || '#7E69AB', 

          description: creatableDataFields.description,
          background_image_url: creatableDataFields.background_image_url,
          icon_url: creatableDataFields.icon_url,
          icon_name: creatableDataFields.icon_name,
          week_identifier: creatableDataFields.week_identifier, // Should now be fine
          background_images: creatableDataFields.background_images, // Should now be fine
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
