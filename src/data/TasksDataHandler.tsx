
import { useQuery, useMutation, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// Removed isTaskRecurringToday, kept processTasksWithRecurringLogic
import { Task, processTasksWithRecurringLogic } from '@/lib/taskUtils'; 
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
  // Signature matches the one in TasksContext.tsx
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
        const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) || [];
        savedTask = currentTasks.find(t => t.id === id);

      } else { // New task: Create
        const newTask = await createTaskMutation.mutateAsync(taskData);
        savedTask = newTask as Task;
        // onSuccess in useCreateTask handles cache update via syncCardById
      }
      toast({ title: 'Task Saved', description: 'Your task has been successfully saved.' });
      // Invalidate tasks query to reflect changes from server/cache updates by mutations
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      // It also invalidates query ['tasks']
      return true;
    } catch (e: any) {
      console.error('Error deleting task:', e);
      // Toasting is handled within useDeleteTask
      return false;
    }
  };

  // The pointsValue parameter was added here to match the context
  const toggleTaskCompletion = async (taskId: string, completed: boolean, pointsValue: number): Promise<boolean> => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const updates: Partial<Task> = {
        completed,
        last_completed_date: completed ? todayStr : null,
      };
      
      // If task is completed, record completion for points and weekly metrics
      if (completed) {
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
          // This should ideally not happen if the user is logged in.
          // Consider if throwing an error is better or just logging.
          console.error("User not authenticated for points update");
          // Do not throw error here to allow task completion to proceed if points update fails
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
                    queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
                }
            }
        }
      }
      // Invalidate tasks query to reflect changes from server/cache updates by mutations
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task Updated', description: `Task marked as ${completed ? 'complete' : 'incomplete'}.` });
      return true;
    } catch (e: any) {
      console.error('Error toggling task completion:', e);
      toast({ title: 'Error Updating Task', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  return {
    tasks: processTasksWithRecurringLogic(tasks || []), // Ensure tasks are processed, handle tasks potentially being undefined initially
    isLoading,
    error,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetchTasks,
  };
};
