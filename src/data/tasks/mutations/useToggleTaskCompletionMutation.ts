import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Task } from '@/lib/taskUtils'; // Assuming Task type is defined here
import { TASKS_QUERY_KEY } from '@/data/tasks/queries'; // Assuming TASKS_QUERY_KEY is defined
import { updateProfilePoints } from '@/data/sync/updateProfilePoints'; // If tasks affect points
import { getProfilePointsQueryKey, PROFILE_POINTS_QUERY_KEY_BASE } from '@/data/points/usePointsManager';

interface ToggleTaskCompletionVariables {
  taskId: string;
  isCompleted: boolean; // The new desired state
  points?: number; // Optional: points awarded/deducted for this task
  profileId?: string; // Optional: if points are affected, whose profile
  currentSubPoints?: number; // Optional: for point calculation
  currentDomPoints?: number; // Optional: for point calculation
  maxCompletions?: number; // Maximum number of completions allowed
  currentCompletions?: number; // Current number of completions
}

interface TaskCompletionContext {
  previousTask?: Task;
  previousProfilePoints?: any;
}

export const useToggleTaskCompletionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, ToggleTaskCompletionVariables, TaskCompletionContext>({
    mutationFn: async ({ 
      taskId, 
      isCompleted, 
      points, 
      profileId, 
      currentSubPoints, 
      currentDomPoints,
      maxCompletions,
      currentCompletions
    }) => {
      // Check if we've reached max completions
      if (isCompleted && maxCompletions !== undefined && currentCompletions !== undefined) {
        if (currentCompletions >= maxCompletions) {
          throw new Error(`Task has already been completed the maximum number of times (${maxCompletions}).`);
        }
      }

      // 1. Update task completion status in DB
      const { data: updatedTask, error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ 
          completed: isCompleted, 
          updated_at: new Date().toISOString(),
          completions: isCompleted ? (currentCompletions || 0) + 1 : currentCompletions
        })
        .eq('id', taskId)
        .select()
        .single();

      if (taskUpdateError) throw taskUpdateError;
      if (!updatedTask) throw new Error('Failed to update task, no data returned.');

      // 2. Record completion history if needed
      if (isCompleted) {
        try {
          await supabase.from('task_completions').insert({
            task_id: taskId,
            profile_id: profileId,
            completed_at: new Date().toISOString(),
            points_awarded: points || 0
          });
        } catch (error) {
          console.error("Error recording task completion history:", error);
          // Don't throw here, as the main task update succeeded
        }
      }

      // 3. Update points if task completion affects points
      if (points && profileId && typeof currentSubPoints === 'number' && typeof currentDomPoints === 'number') {
        const pointsToAdd = isCompleted ? points : -points; // Add if completed, subtract if un-completed
        const newSubPoints = currentSubPoints + pointsToAdd;
        
        // Update profile points in database
        const { error: pointsUpdateError } = await supabase
          .from('profiles')
          .update({ 
            points: newSubPoints,
            updated_at: new Date().toISOString() 
          })
          .eq('id', profileId);
          
        if (pointsUpdateError) {
          console.error("Error updating profile points:", pointsUpdateError);
          throw pointsUpdateError;
        }
        
        // Update points in cache
        await updateProfilePoints(profileId, newSubPoints, currentDomPoints);
      }
      
      return updatedTask as Task;
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      
      // If points are affected, also cancel those queries
      if (variables.profileId && variables.points) {
        const profilePointsKey = getProfilePointsQueryKey(variables.profileId);
        await queryClient.cancelQueries({ queryKey: profilePointsKey });
        await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      }
      
      // Save the previous values
      const previousTask = queryClient.getQueryData<Task>(['tasks', variables.taskId]);
      let previousProfilePoints;
      
      if (variables.profileId && variables.points) {
        previousProfilePoints = queryClient.getQueryData(getProfilePointsQueryKey(variables.profileId));
      }
      
      // Optimistically update tasks list
      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) => {
        return old.map(task => {
          if (task.id === variables.taskId) {
            return {
              ...task,
              completed: variables.isCompleted,
              completions: variables.isCompleted 
                ? (variables.currentCompletions || 0) + 1 
                : variables.currentCompletions
            };
          }
          return task;
        });
      });
      
      // Optimistically update individual task if it exists in cache
      queryClient.setQueryData<Task>(['tasks', variables.taskId], (old) => {
        if (!old) return old;
        return {
          ...old,
          completed: variables.isCompleted,
          completions: variables.isCompleted 
            ? (variables.currentCompletions || 0) + 1 
            : variables.currentCompletions
        };
      });
      
      // Optimistically update points if applicable
      if (variables.profileId && variables.points && 
          typeof variables.currentSubPoints === 'number' && 
          typeof variables.currentDomPoints === 'number') {
        
        const pointsToAdd = variables.isCompleted ? variables.points : -variables.points;
        const newSubPoints = variables.currentSubPoints + pointsToAdd;
        
        queryClient.setQueryData(getProfilePointsQueryKey(variables.profileId), {
          points: newSubPoints,
          dom_points: variables.currentDomPoints
        });
        
        // Also update legacy keys
        queryClient.setQueryData(['rewards', 'points', variables.profileId], newSubPoints);
        
        // Update base key if this is the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === variables.profileId) {
          queryClient.setQueryData([PROFILE_POINTS_QUERY_KEY_BASE], {
            points: newSubPoints,
            dom_points: variables.currentDomPoints
          });
        }
      }
      
      return { previousTask, previousProfilePoints };
    },
    onSuccess: (data, variables) => {
      toast({
        title: `Task ${variables.isCompleted ? 'Completed' : 'Marked Incomplete'}`,
        description: `Task "${data.title}" has been updated.`,
      });
    },
    onError: (error, variables, context) => {
      // Revert optimistic updates
      if (context?.previousTask) {
        queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) => {
          return old.map(task => task.id === variables.taskId ? context.previousTask as Task : task);
        });
        
        queryClient.setQueryData<Task>(['tasks', variables.taskId], context.previousTask);
      }
      
      // Revert points if applicable
      if (variables.profileId && variables.points && context?.previousProfilePoints) {
        queryClient.setQueryData(getProfilePointsQueryKey(variables.profileId), context.previousProfilePoints);
        queryClient.setQueryData(['rewards', 'points', variables.profileId], context.previousProfilePoints.points);
      }
      
      toast({
        title: 'Error Updating Task',
        description: error.message || 'Could not update task status.',
        variant: 'destructive',
      });
    },
    onSettled: (_data, _error, variables) => {
      // Always invalidate affected queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
      
      // If points were affected, also invalidate points queries
      if (variables.points && variables.profileId) {
        queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(variables.profileId) });
        queryClient.invalidateQueries({ queryKey: ['rewards', 'points', variables.profileId] });
        queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
      }
    },
  });
};
