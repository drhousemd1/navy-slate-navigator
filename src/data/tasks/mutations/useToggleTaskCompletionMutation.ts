
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TASKS_QUERY_KEY, taskQueryKey } from "@/data/tasks/queries";
import { TaskWithId } from "@/data/tasks/types"; 
import { toast } from "@/hooks/use-toast";
// Date utilities are commented out as they are unavailable and usage was removed.
// import { getCurrentWeekDates, getDayOfWeek, getWeekIdentifier } from "@/lib/dateUtils"; 

interface ToggleTaskCompletionContext {
  previousTasks?: TaskWithId[];
  previousTask?: TaskWithId | null;
}

export const useToggleTaskCompletionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TaskWithId | null,
    Error,
    { taskId: string; completed: boolean; points?: number; currentTasks?: TaskWithId[]; userId?: string /* Added userId if needed for points */ },
    ToggleTaskCompletionContext // Added context type
  >({
    mutationFn: async ({ taskId, completed, points, userId }) => { // Destructure userId
      // ... (commented out date logic remains commented)

      const { data, error } = await supabase
        .from("tasks")
        .update({
          completed,
          last_completed_date: completed ? new Date().toISOString() : null,
          // usage_data: newUsageData, 
          // week_identifier: weekIdentifier, 
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;

      // Ensure task data (which should include user_id after type fix) is used for points update
      const taskUserId = data?.user_id || userId; // Prefer data.user_id, fallback to passed userId

      if (completed && points && taskUserId) {
        const { error: pointsError } = await supabase.rpc('increment_user_points' as any, { // Cast to any for RPC name
          user_id_param: taskUserId, 
          points_to_add: points 
        });
        if (pointsError) {
          console.error("Error updating points:", pointsError);
          toast({ title: "Points Update Failed", description: pointsError.message, variant: "destructive" });
        } else {
          queryClient.invalidateQueries({ queryKey: ['profile_points', taskUserId] });
          queryClient.invalidateQueries({ queryKey: ['profile_points'] }); 
        }
      } else if (!completed && points && taskUserId) {
        const { error: pointsError } = await supabase.rpc('decrement_user_points' as any, { // Cast to any for RPC name
            user_id_param: taskUserId,
            points_to_subtract: points
        });
         if (pointsError) {
          console.error("Error updating points:", pointsError);
          toast({ title: "Points Update Failed", description: pointsError.message, variant: "destructive" });
        } else {
          queryClient.invalidateQueries({ queryKey: ['profile_points', taskUserId] });
          queryClient.invalidateQueries({ queryKey: ['profile_points'] });
        }
      }

      return data as TaskWithId | null;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: taskQueryKey(variables.taskId) });

      const previousTasks = queryClient.getQueryData<TaskWithId[]>(TASKS_QUERY_KEY);
      const previousTask = queryClient.getQueryData<TaskWithId | null>(taskQueryKey(variables.taskId)); // Ensure TaskWithId | null

      if (previousTasks) {
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, (old) =>
          old?.map((task) =>
            task.id === variables.taskId
              ? { ...task, completed: variables.completed, last_completed_date: variables.completed ? new Date().toISOString() : null }
              : task
          ) ?? []
        );
      }

      if (previousTask !== undefined) { // Check for undefined explicitly for single task
        queryClient.setQueryData<TaskWithId | null>(taskQueryKey(variables.taskId), (old) => // Ensure TaskWithId | null
          old ? { ...old, completed: variables.completed, last_completed_date: variables.completed ? new Date().toISOString() : null } : null
        );
      }
      
      return { previousTasks, previousTask };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, context.previousTasks);
      }
      if (context?.previousTask !== undefined) { // Check for undefined
        queryClient.setQueryData<TaskWithId | null>(taskQueryKey(variables.taskId), context.previousTask);
      }
      toast({ title: "Error", description: `Failed to update task: ${err.message}`, variant: "destructive" });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: taskQueryKey(variables.taskId) });
      // Use task's user_id from data if available, otherwise from variables if passed
      const taskUserId = data?.user_id || variables.userId;
      if (taskUserId) {
        queryClient.invalidateQueries({ queryKey: ['profile_points', taskUserId] });
        queryClient.invalidateQueries({ queryKey: ['profile_points'] });
      }
    },
  });
};
