import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getCurrentDayOfWeek, processTaskFromDb } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { TaskWithId, RawSupabaseTask } from '@/data/tasks/types';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';


interface ToggleTaskCompletionVariables {
  taskId: string;
  completed: boolean; // This 'completed' now means "an instance of completion occurred"
  pointsValue: number;
  task?: TaskWithId; // Optional, as we will fetch fresh task data
}

export function useToggleTaskCompletionMutation() {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation<void, Error, ToggleTaskCompletionVariables, { previousTasks?: TaskWithId[] }>(
    {
      mutationFn: async ({ taskId, completed: instanceCompleted, pointsValue }) => {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user?.id) {
          toast({ title: 'Authentication Error', description: "User not authenticated.", variant: 'destructive' });
          throw new Error("User not authenticated.");
        }
        const userId = authUser.user.id;

        // Fetch the current task state from DB for accuracy
        const { data: taskData, error: fetchTaskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchTaskError) {
          logger.error('Error fetching task for completion toggle:', fetchTaskError);
          toast({ title: 'Error Fetching Task', description: fetchTaskError.message, variant: 'destructive' });
          throw fetchTaskError;
        }
        if (!taskData) {
          throw new Error(`Task with ID ${taskId} not found.`);
        }

        const currentTask = processTaskFromDb(taskData as RawSupabaseTask);
        const dayOfWeek = getCurrentDayOfWeek();
        const currentUsageData = currentTask.usage_data || Array(7).fill(0);
        const newUsageData = [...currentUsageData];
        const frequencyCount = currentTask.frequency_count || 1;

        if (instanceCompleted) {
          newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
        } else {
          newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
        }

        const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
        // Determine the task's overall completed status for the DB
        // If it has frequency/count, completion depends on usage_data meeting frequency_count.
        // Otherwise (e.g. one-off tasks), it depends on the 'instanceCompleted' flag.
        const taskCompletedStatusForDb = (currentTask.frequency && currentTask.frequency_count > 0)
          ? isNowFullyCompletedForDay
          : instanceCompleted;

        const todayStr = new Date().toISOString().split('T')[0];
        const taskFieldsToUpdate: {
          completed: boolean;
          last_completed_date: string | null;
          usage_data: number[];
          updated_at: string;
        } = {
          completed: taskCompletedStatusForDb,
          last_completed_date: instanceCompleted ? todayStr : (taskCompletedStatusForDb ? currentTask.last_completed_date : null),
          usage_data: newUsageData,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskFieldsToUpdate)
          .eq('id', taskId);

        if (updateError) {
          toast({ title: 'Error Updating Task', description: updateError.message, variant: 'destructive' });
          throw updateError;
        }

        // Handle points and history logging only if an instance was completed
        if (instanceCompleted) {
          const { error: historyError } = await supabase
            .from('task_completion_history')
            .insert({ task_id: taskId, user_id: userId, completed_at: new Date().toISOString() });

          if (historyError) {
            logger.error('Error recording task completion history:', historyError);
            toast({ title: 'History Record Error', description: historyError.message, variant: 'destructive' });
            // Not throwing here to allow points update if possible, but logging it.
          }

          const { data: currentProfile, error: fetchProfileError } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', userId)
            .single();

          if (fetchProfileError) {
            logger.error('Error fetching profile for points update:', fetchProfileError);
            toast({ title: 'Profile Fetch Error', description: fetchProfileError.message, variant: 'destructive' });
            throw fetchProfileError;
          }

          const newPoints = (currentProfile?.points || 0) + pointsValue;
          const { error: updatePointsError } = await supabase
            .from('profiles')
            .update({ points: newPoints, updated_at: new Date().toISOString() })
            .eq('id', userId);

          if (updatePointsError) {
            logger.error('Error updating profile points:', updatePointsError);
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

              if (completed) { 
                newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
              } else { 
                newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
              }
              
              const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
              const taskCompletedStatus = (task.frequency && task.frequency_count) ? isNowFullyCompletedForDay : completed;


              return { 
                ...task, 
                completed: taskCompletedStatus, 
                last_completed_date: completed ? todayStr : (taskCompletedStatus ? task.last_completed_date : null), 
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

                if (variables.completed) { // variables.completed here means an instance of completion
                  newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
                } else { 
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
            logger.debug('[useToggleTaskCompletionMutation onSuccessCallback] IndexedDB updated for task completion with usage_data.');
        } catch (e: unknown) {
            let errorMessage = "Task status updated on server, but local sync failed.";
            if (e instanceof Error) {
              errorMessage = e.message;
            }
            logger.error('[useToggleTaskCompletionMutation onSuccessCallback] Error updating IndexedDB:', errorMessage, e);
            toast({ variant: "destructive", title: "Local Sync Error", description: errorMessage });
        }
      },
      onError: (error, variables, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, context.previousTasks);
        }
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
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        if (subUserId) { 
            queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
        }
        queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY }); 
        queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      },
    }
  );
}
