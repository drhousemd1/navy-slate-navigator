
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';

interface ToggleCompletionWorkflowVariables {
  taskId: string;
  completed: boolean;
  pointsValue: number;
}

export function useToggleCompletionWorkflowMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleCompletionWorkflowVariables, { previousTasks?: Task[] }>(
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

        // 1. Update task completion status and last_completed_date
        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskFieldsToUpdate)
          .eq('id', taskId);

        if (updateError) {
          toast({ title: 'Error Updating Task', description: updateError.message, variant: 'destructive' });
          throw updateError;
        }

        if (completed) {
          // 2. Record in task_completion_history
          const { error: historyError } = await supabase
            .from('task_completion_history')
            .insert({ task_id: taskId, user_id: userId });

          if (historyError) {
            console.error('Error recording task completion history:', historyError);
            toast({ title: 'History Record Error', description: historyError.message, variant: 'destructive' });
            // Decide on error handling: rethrow or allow partial success. For now, rethrow.
            throw historyError;
          }

          // 3. Update user points
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
        // If un-completing, no points or history logic needed beyond task update.
      },
      onMutate: async ({ taskId, completed }) => {
        await queryClient.cancelQueries({ queryKey: ['tasks'] });
        const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
        if (previousTasks) {
          const todayStr = new Date().toISOString().split('T')[0];
          queryClient.setQueryData<Task[]>(['tasks'],
            previousTasks.map(task =>
              task.id === taskId
                ? { ...task, completed, last_completed_date: completed ? todayStr : null }
                : task
            )
          );
        }
        return { previousTasks };
      },
      onSuccess: (data, variables) => {
        toast({ 
          title: `Task ${variables.completed ? 'Completed' : 'Marked Incomplete'}`, 
          description: variables.completed ? 'Points and history have been updated.' : 'Task status updated.' 
        });
        if (variables.completed) {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
        }
      },
      onError: (error, variables, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData<Task[]>(['tasks'], context.previousTasks);
        }
        // Specific toasts are in mutationFn, this is a fallback.
        // Avoid double-toasting if a specific error was already shown.
        if (!error.message.includes('Error') && !error.message.includes('User not authenticated')) {
             toast({ title: 'Task Workflow Failed', description: error.message, variant: 'destructive' });
        }
      },
      onSettled: (data, error, variables) => {
        // Always refetch tasks to ensure data consistency after the workflow.
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        // If the task was completed, also refetch points-related queries as a safeguard,
        // though onSuccess should cover it.
        if (variables.completed) {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
        }
      },
    }
  );
}
