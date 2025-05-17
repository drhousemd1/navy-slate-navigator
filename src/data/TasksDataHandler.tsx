
import { useQuery, useMutation, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, isTaskRecurringToday, processTasksWithRecurringLogic } from '@/lib/taskUtils';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks,
} from './indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';
import { fetchTasks } from './queries/tasks/fetchTasks';
import { useCreateTask } from './mutations/useCreateTask';
import { useCompleteTask } from './mutations/useCompleteTask'; // This hook can be used for general updates
import { useDeleteTask } from './mutations/tasks/useDeleteTask';

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
    queryFn: fetchTasks, // Use the new fetchTasks function
    // Default staleTime, gcTime etc., are now handled by PersistQueryClientProvider defaults
  });

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useCompleteTask(); // Re-using for general updates
  const deleteTaskMutation = useDeleteTask();

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      let savedTask: Task | undefined | null = null;
      if (taskData.id) { // Existing task: Update
        // Ensure only valid fields are passed to update
        const { id, ...updates } = taskData;
        await updateTaskMutation.mutateAsync({ taskId: id, updates });
        // The onSuccess in useCompleteTask handles cache update via syncCardById
        // We might want to fetch the full task here if syncCardById isn't sufficient
        // For now, assume syncCardById correctly updates the cache with the full task
        const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) || [];
        savedTask = currentTasks.find(t => t.id === id);

      } else { // New task: Create
        const newTask = await createTaskMutation.mutateAsync(taskData);
        savedTask = newTask as Task;
        // onSuccess in useCreateTask handles cache update via syncCardById
      }
      toast({ title: 'Task Saved', description: 'Your task has been successfully saved.' });
      return savedTask || null;
    } catch (e: any) {
      console.error('Error saving task:', e);
      toast({ title: 'Error Saving Task', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      // onSuccess in useDeleteTask handles cache and IndexedDB updates
      return true;
    } catch (e: any) {
      console.error('Error deleting task:', e);
      // Toasting is handled within useDeleteTask
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
      
      // If task is completed, record completion for points and weekly metrics
      if (completed) {
        // Add task_id and user_id to task_completion_history
        // This should ideally be part of the mutation or a backend function for atomicity
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
            await supabase.from('task_completion_history').insert({ task_id: taskId, user_id: userData.user.id });
        } else {
            console.warn("User not found for task completion history");
        }
      }

      await updateTaskMutation.mutateAsync({ taskId, updates });
       // onSuccess in useCompleteTask handles cache update via syncCardById

      // Update points locally (this should be a mutation itself or part of a larger transaction)
      if (completed) {
        const { data: profileData, error: profileError } = await supabase.auth.getUser();
        if (profileError || !profileData.user) {
          throw new Error("User not authenticated");
        }
        const userId = profileData.user.id;
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;
        
        const newPoints = (currentProfile?.points || 0) + pointsValue;
        await supabase.from('profiles').update({ points: newPoints }).eq('id', userId);
        queryClient.invalidateQueries({ queryKey: ['profile_points'] }); // Invalidate profile points to refetch
        queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] }); // Also invalidate weekly metrics

      }

      toast({ title: 'Task Updated', description: `Task marked as ${completed ? 'complete' : 'incomplete'}.` });
      return true;
    } catch (e: any) {
      console.error('Error toggling task completion:', e);
      toast({ title: 'Error Updating Task', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  return {
    tasks: processTasksWithRecurringLogic(tasks), // Ensure tasks are processed
    isLoading,
    error,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetchTasks,
  };
};
