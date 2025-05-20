
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TASKS_QUERY_KEY } from '../queries';
import { TaskWithId } from '../types'; // Use TaskWithId
import { toast } from '@/hooks/use-toast';
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';
// Removed unused dateUtils imports: getCurrentWeekDates, getDayOfWeek, getWeekIdentifier

export interface ToggleTaskCompletionVariables {
  taskId: string;
  isCompleted: boolean;
  points: number;
  frequency: 'daily' | 'weekly'; // Made non-optional as task should have it
  frequency_count: number; // Made non-optional
  last_completed_date: string | null;
  week_identifier: string | null;
  user_id: string;
}

async function toggleTaskCompletionAPI(variables: ToggleTaskCompletionVariables): Promise<TaskWithId | null> {
  const { taskId, isCompleted, points, user_id, last_completed_date } = variables; // frequency, frequency_count, week_identifier are available if needed
  const today = new Date().toISOString().split('T')[0];
  // Removed unused: currentDayOfWeek, currentWeekIdentifier

  // Update task completion status
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      completed: isCompleted,
      last_completed_date: isCompleted ? today : last_completed_date,
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
        user_id: user_id,
      });
    if (historyError) {
      console.error("Error recording task completion history:", historyError);
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
    await updateProfilePoints(user_id, newPoints, undefined); // Pass undefined or actual dom_points change if any

  } else {
    // Logic for un-completing (e.g., point deduction) can be added here
    // For now, simplified: if uncompleting, deduct points if they were awarded
    // This part needs careful consideration of game logic
    if (points > 0) { // Only deduct if task completion awarded points
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', user_id)
            .single();

        if (profileError) throw profileError;

        const currentPoints = profileData?.points || 0;
        const newPoints = Math.max(0, currentPoints - points); // Ensure points don't go negative

        const { error: pointsUpdateError } = await supabase
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', user_id);
        
        if (pointsUpdateError) throw pointsUpdateError;
        await updateProfilePoints(user_id, newPoints, undefined);
    }
  }

  return updatedTask as TaskWithId | null;
}

export function useToggleTaskCompletionMutation() {
  const queryClient = useQueryClient();

  return useMutation<TaskWithId | null, Error, ToggleTaskCompletionVariables>({ // Return type changed to TaskWithId
    mutationFn: toggleTaskCompletionAPI,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['profile_points', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['profile_points'] });
      
      toast({
        title: data?.completed ? "Task Completed!" : "Task Updated",
        description: data?.completed ? `You earned ${variables.points} points.` : `Task status reverted. ${variables.points > 0 ? `${variables.points} points deducted.` : ''}`,
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

