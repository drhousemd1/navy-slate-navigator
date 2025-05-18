import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, processTasksWithRecurringLogic } from '@/lib/taskUtils'; 
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from './queries/tasks/fetchTasks'; // Corrected path
// Updated import paths for mutations
import { useCreateTask } from './tasks/mutations/useCreateTask';
import { useUpdateTask } from './tasks/mutations/useUpdateTask'; // Assuming useCompleteTask maps to useUpdateTask
import { useDeleteTask } from './tasks/mutations/useDeleteTask';

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
  const { mutateAsync: updateTaskMutation } = useUpdateTask(); // Changed from useCompleteTask
  const { mutateAsync: deleteTaskMutation } = useDeleteTask();

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      let savedTask: Task | undefined | null = null;
      if (taskData.id) {
        const { id, ...updates } = taskData;
        // Ensure updates match UpdateTaskVariables: { taskId: string; updates: Partial<Omit<Task, 'id'>> }
        savedTask = await updateTaskMutation({ taskId: id, updates });
      } else {
        // Ensure taskData matches CreateTaskVariables: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date'>> & { title: string; points: number; }
        const { id, created_at, updated_at, completed, last_completed_date, ...creatableData } = taskData;
        const variables = {
          title: creatableData.title || "Default Task Title",
          points: creatableData.points || 0,
          ...creatableData
        };
        savedTask = await createTaskMutation(variables as any); // Cast if necessary
      }
      // Toasts are handled by optimistic mutation hooks
      // queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Handled by optimistic mutation hooks
      return savedTask || null;
    } catch (e: any) {
      console.error('Error saving task:', e);
      // Toast is handled by optimistic mutation hooks, but can add context here
      toast({ title: 'Error Saving Task on Page', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      await deleteTaskMutation(taskId);
      // Toast and cache invalidation are handled by useDeleteTask
      return true;
    } catch (e: any) {
      console.error('Error deleting task:', e);
      // Toast is handled by useDeleteTask
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
      
      await updateTaskMutation({ taskId, updates });
      // Toast and cache invalidation handled by useUpdateTask

      if (completed) {
        // ... (keep existing points update logic, this should ideally be its own mutation)
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
                    queryClient.invalidateQueries({ queryKey: ['profile_points'] });
                    queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] }); // Consider if this is still needed
                }
            }
        }
      }
      toast({ title: 'Task Updated', description: `Task marked as ${completed ? 'complete' : 'incomplete'}.` }); // This can be specific feedback
      return true;
    } catch (e: any) {
      console.error('Error toggling task completion:', e);
      toast({ title: 'Error Updating Task', description: e.message, variant: 'destructive' });
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
