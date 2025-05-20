
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TASKS_QUERY_KEY, taskQueryKey } from "@/data/tasks/queries";
import { TaskWithId } from "@/data/tasks/types"; 
import { toast } from "@/hooks/use-toast";

interface ToggleTaskCompletionContext {
  previousTasks?: TaskWithId[];
  previousTask?: TaskWithId | null;
}

export const useToggleTaskCompletionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TaskWithId | null, 
    Error, 
    { taskId: string; completed: boolean; points?: number; userId: string }, 
    ToggleTaskCompletionContext 
  >({
    mutationFn: async ({ taskId, completed, points, userId }) => {
      // user_id is now passed in and expected to be valid.
      if (!userId) {
        throw new Error("User ID is required to toggle task completion and update points.");
      }

      const { data: updatedTaskData, error: updateError } = await supabase
        .from("tasks")
        .update({
          completed,
          last_completed_date: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId)
        .eq("user_id", userId) // Ensure operation is on user's task
        .select()
        .single();

      if (updateError) {
        // If RLS prevents update due to mismatched user_id, error will be caught here
        toast({ title: "Task Update Error", description: updateError.message, variant: "destructive" });
        throw updateError;
      }
      if (!updatedTaskData) throw new Error("Task update failed to return data.");

      if (points && points !== 0) { // Only proceed if points are involved
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error("Error fetching profile for points update:", profileError);
          toast({ title: "Profile Fetch Error", description: profileError.message, variant: "destructive" });
          // Decide if this should throw or just warn. For now, let task update succeed but warn about points.
        } else if (profile) {
          const currentPoints = profile.points || 0;
          const newPoints = completed ? currentPoints + points : Math.max(0, currentPoints - points);
          
          const { error: pointsUpdateError } = await supabase
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', userId);

          if (pointsUpdateError) {
            console.error("Error updating points directly on profile:", pointsUpdateError);
            toast({ title: "Points Update Failed", description: pointsUpdateError.message, variant: "destructive" });
          } else {
            // Invalidate queries related to user points
            queryClient.invalidateQueries({ queryKey: ['profile_points', userId] }); 
            queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY(userId) });
             // Also invalidate general points queries if they exist
            queryClient.invalidateQueries({ queryKey: ['profile_points'] });

            toast({ title: "Points Updated", description: `You now have ${newPoints} points.` });
          }
        } else {
           toast({ title: "Profile Not Found", description: "User profile not found for points update.", variant: "warning" });
        }
      }
      
      return { ...updatedTaskData, user_id: userId } as TaskWithId; // Ensure user_id is in the returned object
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: taskQueryKey(variables.taskId) });

      const previousTasks = queryClient.getQueryData<TaskWithId[]>(TASKS_QUERY_KEY);
      const previousTask = queryClient.getQueryData<TaskWithId | null>(taskQueryKey(variables.taskId));

      if (previousTasks) {
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, (old) =>
          old?.map((task) =>
            task.id === variables.taskId && task.user_id === variables.userId // Optimistic update for the correct user's task
              ? { ...task, completed: variables.completed, last_completed_date: variables.completed ? new Date().toISOString() : null }
              : task
          ) ?? []
        );
      }

      if (previousTask !== undefined && previousTask?.user_id === variables.userId) { // Check user_id for single task optimistic update
        queryClient.setQueryData<TaskWithId | null>(taskQueryKey(variables.taskId), (old) =>
          old ? { ...old, completed: variables.completed, last_completed_date: variables.completed ? new Date().toISOString() : null } : null
        );
      }
      
      return { previousTasks, previousTask };
    },
    onError: (err, variables, context: ToggleTaskCompletionContext | undefined) => { // Ensure context is typed
      if (context?.previousTasks) {
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, context.previousTasks);
      }
      if (context?.previousTask !== undefined) { // Check if previousTask was actually set
        queryClient.setQueryData<TaskWithId | null>(taskQueryKey(variables.taskId), context.previousTask);
      }
      // Toast was already shown in mutationFn if it's a Supabase error
      if (!err.message.includes("Task Update Error") && !err.message.includes("Points Update Failed")) {
         toast({ title: "Error", description: `Failed to update task: ${err.message}`, variant: "destructive" });
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: taskQueryKey(variables.taskId) });
      
      const taskUserId = data?.user_id || variables.userId;
      if (taskUserId) {
        queryClient.invalidateQueries({ queryKey: ['profile_points', taskUserId] });
        queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY(taskUserId) });
        queryClient.invalidateQueries({ queryKey: ['profile_points'] });
      }
    },
  });
};

