import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TASKS_QUERY_KEY, taskQueryKey } from "@/data/tasks/queries";
import { TaskWithId } from "@/data/tasks/types"; // Correctly import TaskWithId
import { toast } from "@/hooks/use-toast";
// import { getCurrentWeekDates, getDayOfWeek, getWeekIdentifier } from "@/lib/dateUtils"; // Commented out due to unavailability

export const useToggleTaskCompletionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TaskWithId | null,
    Error,
    { taskId: string; completed: boolean; points?: number; currentTasks?: TaskWithId[] }
  >({
    mutationFn: async ({ taskId, completed, points }) => {
      // const today = new Date();
      // const dayOfWeek = getDayOfWeek(today); // Commented out
      // const weekIdentifier = getWeekIdentifier(today); // Commented out

      // Optimistically update task locally for usage_data if needed
      // let taskToUpdate = queryClient.getQueryData<TaskWithId>(taskQueryKey(taskId));
      // if (!taskToUpdate) {
      //   const tasks = queryClient.getQueryData<TaskWithId[]>(TASKS_QUERY_KEY);
      //   taskToUpdate = tasks?.find(t => t.id === taskId) ?? null;
      // }

      // let newUsageData = taskToUpdate?.usage_data ? [...taskToUpdate.usage_data] : [];
      // TODO: Re-implement usage_data update if date utilities become available
      // if (completed) {
      //   if (!newUsageData.includes(dayOfWeek)) {
      //     newUsageData.push(dayOfWeek);
      //   }
      // } else {
      //   newUsageData = newUsageData.filter(d => d !== dayOfWeek);
      // }

      const { data, error } = await supabase
        .from("tasks")
        .update({
          completed,
          last_completed_date: completed ? new Date().toISOString() : null,
          // usage_data: newUsageData, // Commented out
          // week_identifier: weekIdentifier, // Commented out
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;

      if (completed && points && data?.user_id) {
        const { error: pointsError } = await supabase.rpc('increment_user_points', { 
          user_id_param: data.user_id, 
          points_to_add: points 
        });
        if (pointsError) {
          console.error("Error updating points:", pointsError);
          toast({ title: "Points Update Failed", description: pointsError.message, variant: "destructive" });
          // Potentially throw or handle this more gracefully
        } else {
          // Invalidate points query
          queryClient.invalidateQueries({ queryKey: ['profile_points', data.user_id] });
          queryClient.invalidateQueries({ queryKey: ['profile_points'] }); // Base key
        }
      } else if (!completed && points && data?.user_id) {
        const { error: pointsError } = await supabase.rpc('decrement_user_points', {
            user_id_param: data.user_id,
            points_to_subtract: points
        });
         if (pointsError) {
          console.error("Error updating points:", pointsError);
          toast({ title: "Points Update Failed", description: pointsError.message, variant: "destructive" });
        } else {
          queryClient.invalidateQueries({ queryKey: ['profile_points', data.user_id] });
          queryClient.invalidateQueries({ queryKey: ['profile_points'] });
        }
      }


      return data as TaskWithId | null;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: taskQueryKey(variables.taskId) });

      const previousTasks = queryClient.getQueryData<TaskWithId[]>(TASKS_QUERY_KEY);
      const previousTask = queryClient.getQueryData<TaskWithId>(taskQueryKey(variables.taskId));

      // Optimistic update for the list
      if (previousTasks) {
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, (old) =>
          old?.map((task) =>
            task.id === variables.taskId
              ? { ...task, completed: variables.completed, last_completed_date: variables.completed ? new Date().toISOString() : null }
              : task
          ) ?? []
        );
      }

      // Optimistic update for the single task view
      if (previousTask) {
        queryClient.setQueryData<TaskWithId>(taskQueryKey(variables.taskId), (old) =>
          old ? { ...old, completed: variables.completed, last_completed_date: variables.completed ? new Date().toISOString() : null } : null
        );
      }
      
      return { previousTasks, previousTask };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData<TaskWithId[]>(TASKS_QUERY_KEY, context.previousTasks);
      }
      if (context?.previousTask) {
        queryClient.setQueryData<TaskWithId>(taskQueryKey(variables.taskId), context.previousTask);
      }
      toast({ title: "Error", description: `Failed to update task: ${err.message}`, variant: "destructive" });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: taskQueryKey(variables.taskId) });
      if (data?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['profile_points', data.user_id] });
        queryClient.invalidateQueries({ queryKey: ['profile_points'] });
      }
    },
  });
};
