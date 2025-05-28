import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getCurrentDayOfWeek } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { TaskWithId } from '@/data/tasks/types';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';

interface TaskCompletionVariables {
  taskId: string;
  isCompleting: boolean; // true if adding a completion, false if removing one
  pointsValue: number;
  task: TaskWithId; // The current task object from cache, passed by the caller
}

export function useTaskCompletionMutation() {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation<void, Error, TaskCompletionVariables, { previousTasks?: TaskWithId[] }>({
    mutationFn: async ({ taskId, isCompleting, pointsValue, task: taskFromVariables }) => {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user?.id) {
        toast({ title: 'Authentication Error', description: "User not authenticated.", variant: 'destructive' });
        throw new Error("User not authenticated.");
      }
      const userId = authUser.user.id;

      // Use the task data passed in from variables (reflects current cache state)
      const currentTask = taskFromVariables;

      const dayOfWeek = getCurrentDayOfWeek();
      const currentUsageData = Array.isArray(currentTask.usage_data) ? currentTask.usage_data : Array(7).fill(0);
      const newUsageData = [...currentUsageData];
      const frequencyCount = currentTask.frequency_count || 1;

      if (isCompleting) {
        newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
      } else {
        newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
      }

      const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
      // Determine overall task 'completed' status for the DB based on daily/frequency logic
      const taskCompletedStatusForDb = (currentTask.frequency && currentTask.frequency_count && currentTask.frequency_count > 0)
        ? isNowFullyCompletedForDay
        : isCompleting; // For non-frequency tasks, 'completed' mirrors the action

      const todayStr = new Date().toISOString().split('T')[0];
      const taskFieldsToUpdate: {
        completed: boolean;
        last_completed_date: string | null;
        usage_data: number[];
        updated_at: string;
      } = {
        completed: taskCompletedStatusForDb,
        last_completed_date: isCompleting ? todayStr : (taskCompletedStatusForDb ? currentTask.last_completed_date : null),
        usage_data: newUsageData,
        updated_at: new Date().toISOString(),
      };
      
      logger.debug('[useTaskCompletionMutation] Updating task with data:', { 
        taskId, 
        taskFieldsToUpdate,
        currentCompletions: currentUsageData[dayOfWeek],
        newCompletions: newUsageData[dayOfWeek],
        frequencyCount
      });

      const { error: updateError } = await supabase
        .from('tasks')
        .update(taskFieldsToUpdate)
        .eq('id', taskId);

      if (updateError) {
        toast({ title: 'Error Updating Task', description: updateError.message, variant: 'destructive' });
        throw updateError;
      }

      // Handle points and history logging only if an instance was completed (isCompleting is true)
      if (isCompleting) {
        const { error: historyError } = await supabase
          .from('task_completion_history')
          .insert({ task_id: taskId, user_id: userId, completed_at: new Date().toISOString() });

        if (historyError) {
          logger.error('Error recording task completion history:', historyError);
          // Non-critical, log and toast but don't necessarily throw to stop points
          toast({ title: 'History Record Error', description: historyError.message, variant: 'destructive' });
        }

        const { data: currentProfile, error: fetchProfileError } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();

        if (fetchProfileError) {
          logger.error('Error fetching profile for points update:', fetchProfileError);
          toast({ title: 'Profile Fetch Error', description: fetchProfileError.message, variant: 'destructive' });
          throw fetchProfileError; // Critical for points
        }

        const newPoints = (currentProfile?.points || 0) + pointsValue;
        const { error: updatePointsError } = await supabase
          .from('profiles')
          .update({ points: newPoints, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updatePointsError) {
          logger.error('Error updating profile points:', updatePointsError);
          toast({ title: 'Points Update Error', description: updatePointsError.message, variant: 'destructive' });
          throw updatePointsError; // Critical
        }
      }
    },
    onMutate: async ({ taskId, isCompleting, task: taskFromVariables }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks = queryClient.getQueryData<TaskWithId[]>(TASKS_QUERY_KEY);
      
      queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, (oldTasks = []) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const dayOfWeek = getCurrentDayOfWeek();

        return oldTasks.map(task => {
          if (task.id === taskId) {
            // Use taskFromVariables or task found in oldTasks for optimistic update base
            const baseTaskForOptimistic = task; // taskFromVariables might be more "current" if passed correctly
            const currentUsageData = baseTaskForOptimistic.usage_data || Array(7).fill(0);
            const newUsageData = [...currentUsageData];
            const frequencyCount = baseTaskForOptimistic.frequency_count || 1;

            if (isCompleting) { 
              newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
            } else { 
              newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
            }
            
            const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
            const taskCompletedStatus = (baseTaskForOptimistic.frequency && baseTaskForOptimistic.frequency_count && baseTaskForOptimistic.frequency_count > 0) 
                                        ? isNowFullyCompletedForDay 
                                        : isCompleting;

            logger.debug('[useTaskCompletionMutation onMutate] Optimistic update:', {
              taskId,
              isCompleting,
              currentCompletions: currentUsageData[dayOfWeek],
              newCompletions: newUsageData[dayOfWeek],
              frequencyCount,
              isNowFullyCompletedForDay,
              optimisticCompletedStatus: taskCompletedStatus
            });

            return { 
              ...task, 
              completed: taskCompletedStatus, 
              last_completed_date: isCompleting ? todayStr : (taskCompletedStatus ? task.last_completed_date : null), 
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
        title: `Task ${variables.isCompleting ? 'Activity Logged' : 'Activity Reversed'}`, 
        description: variables.isCompleting ? 'Points and history have been updated if applicable.' : 'Task status updated.' 
      });

      // Keep IndexedDB update logic for now (Phase 1)
      try {
          const localTasks = await loadTasksFromDB() || [];
          const todayStr = new Date().toISOString().split('T')[0];
          const dayOfWeek = getCurrentDayOfWeek();

          const updatedLocalTasks = localTasks.map(t => {
            if (t.id === variables.taskId) {
              const currentUsageData = t.usage_data || Array(7).fill(0);
              const newUsageData = [...currentUsageData];
              const frequencyCount = t.frequency_count || 1;

              if (variables.isCompleting) { 
                newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
              } else { 
                newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
              }
              
              const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
              const taskCompletedStatus = (t.frequency && t.frequency_count && t.frequency_count > 0) ? isNowFullyCompletedForDay : variables.isCompleting;

              return { 
                ...t, 
                completed: taskCompletedStatus, 
                last_completed_date: variables.isCompleting ? todayStr : (taskCompletedStatus ? t.last_completed_date : null),
                usage_data: newUsageData 
              };
            }
            return t;
          });
          await saveTasksToDB(updatedLocalTasks as Task[]);
          await setLastSyncTimeForTasks(new Date().toISOString());
          logger.debug('[useTaskCompletionMutation onSuccess] IndexedDB updated.');
      } catch (e: unknown) {
          let errorMessage = "Task status updated on server, but local sync failed.";
          if (e instanceof Error) {
            errorMessage = e.message;
          }
          logger.error('[useTaskCompletionMutation onSuccess] Error updating IndexedDB:', errorMessage, e);
          toast({ variant: "destructive", title: "Local Sync Error", description: errorMessage });
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, context.previousTasks);
      }
      // Avoid redundant toasts if already handled by specific errors in mutationFn
       if (!error.message.includes('Error Updating Task') && 
           !error.message.includes('History Record Error') &&
           !error.message.includes('Profile Fetch Error') &&
           !error.message.includes('Points Update Error') &&
           !error.message.includes('User not authenticated') &&
           !error.message.includes('Task data was not provided')) { 
           toast({ title: 'Task Status Update Failed', description: error.message, variant: 'destructive' });
      }
    },
    onSettled: (data, error, variables) => {
      // Do NOT invalidate TASKS_QUERY_KEY here to preserve optimistic updates
      // and avoid refetching stale data from server immediately after our update.
      // Related data that might change due to points updates should be invalidated.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (subUserId) { 
          queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
      }
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY }); 
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
    },
  });
}
