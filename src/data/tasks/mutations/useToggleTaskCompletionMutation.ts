import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getCurrentDayOfWeek } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { TaskWithId } from '@/data/tasks/types';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery'; // Added import
import { useUserIds } from '@/contexts/UserIdsContext'; // Added import


interface ToggleTaskCompletionVariables {
  taskId: string;
  completed: boolean;
  pointsValue: number;
  task?: TaskWithId; // Optional: pass the full task for easier optimistic update
}

export function useToggleTaskCompletionMutation() {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds(); // Get subUserId

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
            // Not throwing here to allow points update if possible, but logging it.
            // Or decide to throw: throw historyError;
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
          const dayOfWeek = getCurrentDayOfWeek();

          return oldTasks.map(task => {
            if (task.id === taskId) {
              const currentUsageData = task.usage_data || Array(7).fill(0);
              const newUsageData = [...currentUsageData];
              const frequencyCount = task.frequency_count || 1;

              if (completed) { // Marking as complete
                newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
              } else { // Marking as incomplete
                newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
              }
              
              // The task's main `completed` status reflects if it's fully done for the day/period
              // This is driven by whether the new usage count meets the frequency count
              const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
              // If not a recurring task or no frequency, 'completed' follows the direct 'completed' variable
              const taskCompletedStatus = (task.frequency && task.frequency_count) ? isNowFullyCompletedForDay : completed;


              return { 
                ...task, 
                completed: taskCompletedStatus, 
                last_completed_date: completed ? todayStr : (taskCompletedStatus ? task.last_completed_date : null), // Keep last_completed_date if still completed, else null
                usage_data: newUsageData,
              };
            }
            return task;
          });
        });
        return { previousTasks };
      },
      onSuccess: async (data, variables) => {
        toast({ 
          title: `Task ${variables.completed ? 'Activity Logged' : 'Activity Reversed'}`, 
          description: variables.completed ? 'Points and history have been updated if applicable.' : 'Task status updated.' 
        });

        try {
            const localTasks = await loadTasksFromDB() || [];
            const todayStr = new Date().toISOString().split('T')[0];
            const dayOfWeek = getCurrentDayOfWeek();

            const updatedLocalTasks = localTasks.map(t => {
              if (t.id === variables.taskId) {
                const currentUsageData = t.usage_data || Array(7).fill(0);
                const newUsageData = [...currentUsageData];
                const frequencyCount = t.frequency_count || 1;

                if (variables.completed) { // Action was to mark as complete
                  newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
                } else { // Action was to mark as incomplete
                  newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
                }
                
                const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
                const taskCompletedStatus = (t.frequency && t.frequency_count) ? isNowFullyCompletedForDay : variables.completed;

                return { 
                  ...t, 
                  completed: taskCompletedStatus, 
                  last_completed_date: variables.completed ? todayStr : (taskCompletedStatus ? t.last_completed_date : null),
                  usage_data: newUsageData 
                };
              }
              return t;
            });
            await saveTasksToDB(updatedLocalTasks as Task[]);
            await setLastSyncTimeForTasks(new Date().toISOString());
            console.log('[useToggleTaskCompletionMutation onSuccessCallback] IndexedDB updated for task completion with usage_data.');
        } catch (error) {
            console.error('[useToggleTaskCompletionMutation onSuccessCallback] Error updating IndexedDB:', error);
            toast({ variant: "destructive", title: "Local Sync Error", description: "Task status updated on server, but local sync failed." });
        }
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
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        // Invalidate profile, user-specific points, general rewards points, and weekly summary
        // This ensures all related data is refetched whether a task is completed or uncompleted.
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        if (subUserId) { // Ensure subUserId is available before invalidating
            queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
        }
        queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY }); // This seems to be a general key for points, keeping it.
        queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      },
    }
  );
}
