import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { TaskWithId } from '@/data/tasks/types';


interface ToggleTaskCompletionVariables {
  taskId: string;
  completed: boolean;
  pointsValue: number;
  task?: TaskWithId; // Optional: pass the full task for easier optimistic update
}

export function useToggleTaskCompletionMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleTaskCompletionVariables, { previousTasks?: TaskWithId[] }>(
    {
      mutationFn: async ({ taskId, completed, pointsValue }) => {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user?.id) {
          toast({ title: 'Authentication Error', description: "User not authenticated.", variant: 'destructive' });
          throw new Error("User not authenticated.");
        }
        const userId = authUser.user.id;

        const todayStr = new Date().toISOString().split('T')[0];
        const taskFieldsToUpdate: { completed: boolean; last_completed_date: string | null } = {
          completed,
          last_completed_date: completed ? todayStr : null,
        };

        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskFieldsToUpdate)
          .eq('id', taskId);

        if (updateError) {
          toast({ title: 'Error Updating Task', description: updateError.message, variant: 'destructive' });
          throw updateError;
        }

        if (completed) {
          const { error: historyError } = await supabase
            .from('task_completion_history')
            .insert({ task_id: taskId, user_id: userId });

          if (historyError) {
            console.error('Error recording task completion history:', historyError);
            toast({ title: 'History Record Error', description: historyError.message, variant: 'destructive' });
            throw historyError;
          }

          const { data: currentProfile, error: fetchProfileError } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', userId)
            .single();

          if (fetchProfileError) {
            console.error('Error fetching profile for points update:', fetchProfileError);
            toast({ title: 'Profile Fetch Error', description: fetchProfileError.message, variant: 'destructive' });
            throw fetchProfileError;
          }

          const newPoints = (currentProfile?.points || 0) + pointsValue;
          const { error: updatePointsError } = await supabase
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', userId);

          if (updatePointsError) {
            console.error('Error updating profile points:', updatePointsError);
            toast({ title: 'Points Update Error', description: updatePointsError.message, variant: 'destructive' });
            throw updatePointsError;
          }
        }
      },
      onMutate: async ({ taskId, completed, task: taskFromVariables }) => {
        await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
        const previousTasks = queryClient.getQueryData<TaskWithId[]>(TASKS_QUERY_KEY);
        
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, (oldTasks = []) => {
          const todayStr = new Date().toISOString().split('T')[0];
          return oldTasks.map(task =>
            task.id === taskId
              ? { 
                  ...task, 
                  completed, 
                  last_completed_date: completed ? todayStr : null,
                  // Optimistically update usage_data if applicable (complex, might need more logic)
                  // For daily tasks, if 'completed' is true, increment today's usage_data
                  // This depends on how processTasksWithRecurringLogic and usage_data are structured/used
                }
              : task
          );
        });
        return { previousTasks };
      },
      onSuccess: async (data, variables) => {
        toast({ 
          title: `Task ${variables.completed ? 'Completed' : 'Marked Incomplete'}`, 
          description: variables.completed ? 'Points and history have been updated.' : 'Task status updated.' 
        });

        // Update IndexedDB after successful server update
        try {
            const localTasks = await loadTasksFromDB() || [];
            const todayStr = new Date().toISOString().split('T')[0];
            const updatedLocalTasks = localTasks.map(t => 
              t.id === variables.taskId 
              ? { ...t, completed: variables.completed, last_completed_date: variables.completed ? todayStr : null } 
              : t
            );
            await saveTasksToDB(updatedLocalTasks as Task[]); // Cast if TaskWithId is not directly Task
            await setLastSyncTimeForTasks(new Date().toISOString());
            console.log('[useToggleTaskCompletionMutation onSuccessCallback] IndexedDB updated for task completion.');
        } catch (error) {
            console.error('[useToggleTaskCompletionMutation onSuccessCallback] Error updating IndexedDB:', error);
            toast({ variant: "destructive", title: "Local Update Error", description: "Task status updated on server, but local sync failed." });
        }

        if (variables.completed) {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
        }
        // No explicit invalidation of TASKS_QUERY_KEY here if onSettled handles it,
        // or if optimistic update + onSuccess IndexedDB write is considered sufficient
        // until next natural sync. However, checklist implies immediate data consistency.
      },
      onError: (error, variables, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, context.previousTasks);
        }
        // Generic toast unless specific ones were shown in mutationFn
         if (!error.message.includes('Error Updating Task') && 
             !error.message.includes('History Record Error') &&
             !error.message.includes('Profile Fetch Error') &&
             !error.message.includes('Points Update Error') &&
             !error.message.includes('User not authenticated')) {
             toast({ title: 'Task Status Update Failed', description: error.message, variant: 'destructive' });
        }
      },
      onSettled: (data, error, variables) => {
        // Always refetch tasks to ensure data consistency after the workflow.
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        if (variables.completed) {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
        }
      },
    }
  );
}
