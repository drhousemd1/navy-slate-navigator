
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDayOfWeek } from '@/lib/taskUtils';
import { toastManager } from '@/lib/toastManager';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { TaskWithId, Task } from '@/data/tasks/types';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';
import { usePartnerHelper } from '@/hooks/usePartnerHelper';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface ToggleTaskCompletionVariables {
  taskId: string;
  completed: boolean;
  pointsValue: number;
  task: TaskWithId;
}

export function useToggleTaskCompletionMutation() {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  const { getPartnerId } = usePartnerHelper();
  const { sendTaskCompletedNotification } = usePushNotifications();

  return useMutation<void, Error, ToggleTaskCompletionVariables, { previousTasks?: TaskWithId[] }>(
    {
      mutationFn: async ({ taskId, completed: instanceCompleted, pointsValue, task: taskFromVariables }) => {
        logger.debug('[useToggleTaskCompletionMutation] Starting mutation:', {
          taskId,
          instanceCompleted,
          pointsValue,
          currentUserIds: { subUserId, domUserId }
        });

        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user?.id) {
          logger.error('[useToggleTaskCompletionMutation] User not authenticated');
          toastManager.error('Authentication Error', "User not authenticated.");
          throw new Error("User not authenticated.");
        }
        const userId = authUser.user.id;

        logger.debug('[useToggleTaskCompletionMutation] Authenticated user:', userId);

        if (!taskFromVariables) {
          logger.error('[useToggleTaskCompletionMutation] Task data not provided');
          toastManager.error('Internal Error', "Task data was not provided to the mutation.");
          throw new Error(`Task data for ID ${taskId} not provided.`);
        }
        
        const currentTask = taskFromVariables;
        logger.debug('[useToggleTaskCompletionMutation] Processing task:', {
          taskId: currentTask.id,
          taskUserId: currentTask.user_id,
          currentUserId: userId
        });

        const dayOfWeek = getCurrentDayOfWeek();
        const currentUsageData = Array.isArray(currentTask.usage_data) ? currentTask.usage_data as number[] : Array(7).fill(0);
        const newUsageData = [...currentUsageData];
        const frequencyCount = currentTask.frequency_count || 1;

        if (instanceCompleted) {
          newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
        } else {
          newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
        }

        const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
        const taskCompletedStatusForDb = (currentTask.frequency && currentTask.frequency_count && currentTask.frequency_count > 0)
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

        logger.debug('[useToggleTaskCompletionMutation] Updating task with data:', { 
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
          logger.error('[useToggleTaskCompletionMutation] Error updating task:', updateError);
          toastManager.error('Error Updating Task', updateError.message);
          throw updateError;
        }

        logger.debug('[useToggleTaskCompletionMutation] Task updated successfully');

        if (instanceCompleted) {
          logger.debug('[useToggleTaskCompletionMutation] Recording completion history');
          const { error: historyError } = await supabase
            .from('task_completion_history')
            .insert({ task_id: taskId, user_id: userId, completed_at: new Date().toISOString() });

          if (historyError) {
            logger.error('Error recording task completion history:', historyError);
            toastManager.error('History Record Error', historyError.message);
          }

          logger.debug('[useToggleTaskCompletionMutation] Updating user points');
          
          // Determine which points column to update based on task type
          const pointsColumn = taskFromVariables.is_dom_task ? 'dom_points' : 'points';
          
          const { data: currentProfile, error: fetchProfileError } = await supabase
            .from('profiles')
            .select(`${pointsColumn}`)
            .eq('id', userId)
            .single();

          if (fetchProfileError) {
            logger.error('Error fetching profile for points update:', fetchProfileError);
            toastManager.error('Profile Fetch Error', fetchProfileError.message);
            throw fetchProfileError;
          }

          const currentPoints = currentProfile?.[pointsColumn] || 0;
          const newPoints = currentPoints + pointsValue;
          const updateData = { 
            [pointsColumn]: newPoints, 
            updated_at: new Date().toISOString() 
          };
          
          const { error: updatePointsError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

          if (updatePointsError) {
            logger.error('Error updating profile points:', updatePointsError);
            toastManager.error('Points Update Error', updatePointsError.message);
            throw updatePointsError;
          }

          logger.debug('[useToggleTaskCompletionMutation] Points updated successfully');
        }
      },
      onMutate: async ({ taskId, completed, task: taskFromVariables }) => {
        logger.debug('[useToggleTaskCompletionMutation] onMutate optimistic update');
        await queryClient.cancelQueries({ queryKey: [...TASKS_QUERY_KEY, subUserId, domUserId] });
        const previousTasks = queryClient.getQueryData<TaskWithId[]>([...TASKS_QUERY_KEY, subUserId, domUserId]);
        
        queryClient.setQueryData<TaskWithId[]>([...TASKS_QUERY_KEY, subUserId, domUserId], (oldTasks = []) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const dayOfWeek = getCurrentDayOfWeek();

          return oldTasks.map(task => {
            if (task.id === taskId) {
              const baseTaskForOptimistic = task;
              const currentUsageData = Array.isArray(baseTaskForOptimistic.usage_data) ? baseTaskForOptimistic.usage_data as number[] : Array(7).fill(0);
              const newUsageData = [...currentUsageData];
              const frequencyCount = baseTaskForOptimistic.frequency_count || 1;

              if (completed) { 
                newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
              } else { 
                newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
              }
              
              const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
              const taskCompletedStatus = (baseTaskForOptimistic.frequency && baseTaskForOptimistic.frequency_count && baseTaskForOptimistic.frequency_count > 0) 
                                          ? isNowFullyCompletedForDay 
                                          : completed;

              logger.debug('[useToggleTaskCompletionMutation onMutate] Optimistic update:', {
                taskId,
                currentCompletions: currentUsageData[dayOfWeek],
                newCompletions: newUsageData[dayOfWeek],
                frequencyCount,
                isNowFullyCompletedForDay
              });

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
        logger.debug('[useToggleTaskCompletionMutation] onSuccess callback');
        toastManager.success(
          `Task ${variables.completed ? 'Activity Logged' : 'Activity Reversed'}`, 
          variables.completed ? 'Points and history have been updated if applicable.' : 'Task status updated.'
        );

        // Send push notification to partner when task is completed
        if (variables.completed) {
          logger.info('[useToggleTaskCompletionMutation] ✅ Task completed, attempting to send notification');
          logger.info('[useToggleTaskCompletionMutation] 🔍 Getting partner ID...');
          
          try {
            const partnerId = await getPartnerId();
            logger.info('[useToggleTaskCompletionMutation] 📋 Partner ID retrieved:', partnerId ? 'FOUND' : 'NOT_FOUND', { partnerId });
            
            if (partnerId) {
              logger.info('[useToggleTaskCompletionMutation] 📤 Calling sendTaskCompletedNotification...');
              const notificationSent = await sendTaskCompletedNotification(
                partnerId, 
                variables.task.title, 
                variables.pointsValue
              );
              logger.info('[useToggleTaskCompletionMutation] 📬 Notification result:', notificationSent ? 'SUCCESS' : 'FAILED');
              
              if (!notificationSent) {
                toastManager.warn('Notification Warning', 'Task completed but partner notification failed to send');
              }
            } else {
              logger.warn('[useToggleTaskCompletionMutation] ⚠️ No partner ID found, skipping notification');
            }
          } catch (error) {
            logger.error('[useToggleTaskCompletionMutation] 💥 Exception in notification flow:', error);
            toastManager.error('Notification Error', 'Task completed but notification system encountered an error');
          }
        }


        try {
            const localTasks = await loadTasksFromDB() || [];
            const todayStr = new Date().toISOString().split('T')[0];
            const dayOfWeek = getCurrentDayOfWeek();

            const updatedLocalTasks = localTasks.map(t => {
              if (t.id === variables.taskId) {
                const currentUsageData = Array.isArray(t.usage_data) ? t.usage_data as number[] : Array(7).fill(0);
                const newUsageData = [...currentUsageData];
                const frequencyCount = t.frequency_count || 1;

                if (variables.completed) { 
                  newUsageData[dayOfWeek] = Math.min((newUsageData[dayOfWeek] || 0) + 1, frequencyCount);
                } else { 
                  newUsageData[dayOfWeek] = Math.max((newUsageData[dayOfWeek] || 0) - 1, 0);
                }
                
                const isNowFullyCompletedForDay = newUsageData[dayOfWeek] >= frequencyCount;
                const taskCompletedStatus = (t.frequency && t.frequency_count && t.frequency_count > 0) ? isNowFullyCompletedForDay : variables.completed;

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
            logger.debug('[useToggleTaskCompletionMutation onSuccess] IndexedDB updated for task completion with usage_data.');
        } catch (e: unknown) {
            let errorMessage = "Task status updated on server, but local sync failed.";
            if (e instanceof Error) {
              errorMessage = e.message;
            }
            logger.error('[useToggleTaskCompletionMutation onSuccess] Error updating IndexedDB:', errorMessage, e);
            toastManager.error("Local Sync Error", errorMessage);
        }
      },
      onError: (error, variables, context) => {
        logger.error('[useToggleTaskCompletionMutation] onError:', error);
        if (context?.previousTasks) {
          queryClient.setQueryData<TaskWithId[]>([...TASKS_QUERY_KEY, subUserId, domUserId], context.previousTasks);
        }
         if (!error.message.includes('Error Updating Task') && 
             !error.message.includes('History Record Error') &&
             !error.message.includes('Profile Fetch Error') &&
             !error.message.includes('Points Update Error') &&
             !error.message.includes('User not authenticated') &&
             !error.message.includes('Task data was not provided')) { 
             toastManager.error('Task Status Update Failed', error.message);
        }
      },
      onSettled: (data, error, variables) => {
        logger.debug('[useToggleTaskCompletionMutation] onSettled - invalidating queries');
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
