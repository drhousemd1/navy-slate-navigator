import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, CreateTaskVariables } from './tasks/types'; 
import { processTasksWithRecurringLogic } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from './queries/tasks/fetchTasks';
import { useCreateTask } from './tasks/mutations/useCreateTask';
import { useUpdateTask, UpdateTaskVariables } from './tasks/mutations/useUpdateTask';
import { useDeleteTask } from './tasks/mutations/useDeleteTask';
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
        savedTask = await updateTaskMutation({ 
          id, 
          ...updates 
        } as UpdateTaskVariables);
      } else {
        const creatableDataFields: CreateTaskVariables = {
          title: taskData.title || "Default Task Title",
          description: taskData.description || null,
          points: taskData.points || 0,
          priority: taskData.priority || 'medium',
          completed: taskData.completed ?? false,
          frequency: taskData.frequency || 'daily',
          frequency_count: taskData.frequency_count || 1,
          usage_data: taskData.usage_data || Array(7).fill(0),
          icon_url: taskData.icon_url,
          icon_name: taskData.icon_name,
          icon_color: taskData.icon_color || '#9b87f5',
          highlight_effect: taskData.highlight_effect ?? false,
          title_color: taskData.title_color || '#FFFFFF',
          subtext_color: taskData.subtext_color || '#8E9196',
          calendar_color: taskData.calendar_color || '#7E69AB',
          last_completed_date: taskData.last_completed_date,
          week_identifier: taskData.week_identifier,
          background_image_url: taskData.background_image_url,
          background_opacity: taskData.background_opacity ?? 100,
          focal_point_x: taskData.focal_point_x ?? 50,
          focal_point_y: taskData.focal_point_y ?? 50,
          background_images: taskData.background_images,
        };
        savedTask = await createTaskMutation(creatableDataFields);
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
      return true;
    } catch (e: any) {
      console.error('Error deleting task:', e);
      return false;
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean, pointsValue: number): Promise<boolean> => {
    try {
      await toggleCompletionWorkflowMutateAsync({ taskId, completed, pointsValue });
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
