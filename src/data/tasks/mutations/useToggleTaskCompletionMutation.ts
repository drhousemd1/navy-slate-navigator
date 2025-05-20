
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TASKS_QUERY_KEY } from '../queries';
import { Task } from '../types';
import { toast } from '@/hooks/use-toast';
import { updateProfilePoints } from '@/data/sync/updateProfilePoints'; // Assuming this path is correct
import { getCurrentWeekDates, getDayOfWeek, getWeekIdentifier } from '@/lib/dateUtils'; // Assuming path

export interface ToggleTaskCompletionVariables {
  taskId: string;
  isCompleted: boolean;
  points: number;
  frequency: string;
  frequency_count: number;
  last_completed_date: string | null;
  week_identifier: string | null;
  user_id: string; // Added user_id
}

async function toggleTaskCompletionAPI(variables: ToggleTaskCompletionVariables) {
  const { taskId, isCompleted, points, frequency, frequency_count, last_completed_date, week_identifier, user_id } = variables;
  const today = new Date().toISOString().split('T')[0];
  const currentDayOfWeek = getDayOfWeek(new Date()); // 0 (Sun) - 6 (Sat)
  const currentWeekIdentifier = getWeekIdentifier(new Date());

  // Update task completion status
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      completed: isCompleted,
      last_completed_date: isCompleted ? today : last_completed_date, // Only update if completing
      // Update usage_data if needed based on frequency (complex, simplified here)
    })
    .eq('id', taskId)
    .select()
    .single();

  if (updateError) throw updateError;

  if (isCompleted) {
    // Record completion in history
    const { error: historyError } = await supabase
      .from('task_completion_history')
      .insert({
        task_id: taskId,
        user_id: user_id, // Use user_id from variables
        // completed_at is defaulted by db
      });
    if (historyError) {
      // Rollback task completion status if history fails? (Consider atomicity)
      console.error("Error recording task completion history:", historyError);
      // Potentially throw to trigger onError in useMutation
    }

    // Update user points
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user_id)
      .single();

    if (profileError) throw profileError;

    const currentPoints = profileData?.points || 0;
    const newPoints = currentPoints + points;

    const { error: pointsUpdateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', user_id);

    if (pointsUpdateError) throw pointsUpdateError;
    // Call centralized point update function for cache consistency
    await updateProfilePoints(user_id, newPoints, 0); // Assuming dom_points are not affected here

  } else {
    // If un-completing, potentially deduct points and remove from history (more complex)
    // For now, we only handle completion.
    // Consider implications if a task completion that awarded points is "undone".
  }

  return updatedTask;
}

export function useToggleTaskCompletionMutation() {
  const queryClient = useQueryClient();

  return useMutation<Task | null, Error, ToggleTaskCompletionVariables>({
    mutationFn: toggleTaskCompletionAPI,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['profile_points', variables.user_id] }); // Invalidate specific user points
      queryClient.invalidateQueries({ queryKey: ['profile_points'] }); // Invalidate general points query for usePointsManager
      
      toast({
        title: data?.completed ? "Task Completed!" : "Task Updated",
        description: data?.completed ? `You earned ${variables.points} points.` : "Task status reverted.",
      });
    },
    onError: (error) => {
      console.error("Error toggling task completion:", error);
      toast({
        title: "Error",
        description: error.message || "Could not update task status.",
        variant: "destructive",
      });
    },
  });
}
