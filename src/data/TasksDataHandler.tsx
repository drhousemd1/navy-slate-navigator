import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, processTasksWithRecurringLogic } from '@/lib/taskUtils'; 
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from './queries/tasks/fetchTasks';
import { useCreateTask } from './tasks/mutations/useCreateTask';
import { useUpdateTask, UpdateTaskVariables } from './tasks/mutations/useUpdateTask';
import { useDeleteTask } from './tasks/mutations/useDeleteTask';
import { CreateTaskVariables } from './tasks/types';

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
      const todayStr = new Date().toISOString().split('T')[0];
      const updates: Partial<Task> = {
        completed,
        last_completed_date: completed ? todayStr : null,
      };
      
      await updateTaskMutation({ 
        id: taskId, 
        ...updates 
      } as UpdateTaskVariables);

      if (completed) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
            await supabase.from('task_completion_history').insert({ task_id: taskId, user_id: userData.user.id });
        } else {
            console.warn("User not found for task completion history");
        }
        const { data: profileData, error: profileError } = await supabase.auth.getUser();
        if (profileError || !profileData.user) {
          console.error("User not authenticated for points update");
        } else {
            const userId = profileData.user.id;
            const { data: currentProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('points')
              .eq('id', userId)
              .single();

            if (fetchError) {
                console.error('Error fetching profile for points update:', fetchError);
            } else {
                const newPoints = (currentProfile?.points || 0) + pointsValue;
                const { error: updatePointsError } = await supabase.from('profiles').update({ points: newPoints }).eq('id', userId);
                if (updatePointsError) {
                    console.error('Error updating profile points:', updatePointsError);
                } else {
                    queryClient.invalidateQueries({ queryKey: ['profile'] });
                    queryClient.invalidateQueries({ queryKey: ['rewards', 'points'] });
                    queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
                }
            }
        }
      }
      return true;
    } catch (e: any) {
      console.error('Error toggling task completion:', e);
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
