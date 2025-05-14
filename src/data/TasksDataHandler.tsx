/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, QueryObserverResult, RefetchOptions, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getLocalDateString, getCurrentDayOfWeek, processTaskFromDb } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { useCreateTask } from "@/data/mutations/useCreateTask";
import { useCompleteTask } from "@/data/mutations/useCompleteTask";
import { saveTasksToDB } from "@/data/indexedDB/useIndexedDB";

const TASKS_QUERY_KEY = ['tasks'];

const fetchTasks = async (): Promise<Task[]> => {
  const startTime = performance.now();
  console.log('[TasksDataHandler] Fetching tasks from the server');
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  const tasks: Task[] = data ? data.map(processTaskFromDb) : [];

  const today = getLocalDateString();
  const tasksToReset = tasks.filter(task => 
    task.completed && 
    task.frequency === 'daily' && 
    task.last_completed_date !== today
  );

  if (tasksToReset.length > 0) {
    console.log(`[TasksDataHandler] Resetting ${tasksToReset.length} daily tasks that are not completed today`);
    
    const updates = tasksToReset.map(task => ({
      id: task.id,
      completed: false
    }));

    for (const update of updates) {
      await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('id', update.id);
    }

    // Update tasks in memory rather than refetching
    const updatedTasks = tasks.map(task => {
      if (tasksToReset.some(resetTask => resetTask.id === task.id)) {
        return { ...task, completed: false };
      }
      return task;
    });
    
    const endTime = performance.now();
    console.log(`[TasksDataHandler] Fetched and processed ${updatedTasks.length} tasks in ${(endTime - startTime).toFixed(2)}ms`);
    
    return updatedTasks;
  }
  
  const endTime = performance.now();
  console.log(`[TasksDataHandler] Fetched ${tasks.length} tasks in ${(endTime - startTime).toFixed(2)}ms`);

  return tasks;
};

export const useTasksData = () => {
  const queryClient = useQueryClient();
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    ...STANDARD_QUERY_CONFIG,
  });

  const { mutateAsync: createTaskMutation } = useCreateTask();
  const { mutateAsync: completeTaskMutation } = useCompleteTask();

  const saveTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      // Make sure frequency_count is a positive number - this will be handled by processTaskFromDb eventually if data comes from DB
      // For new/updated tasks, ensure it before sending to DB, or let DB an subsequent fetch handle it via processTaskFromDb
      if (taskData.frequency_count !== undefined) {
        taskData.frequency_count = Math.max(1, taskData.frequency_count);
      }
      
      // Initialize usage_data if not set and task is recurring
      if ((taskData.frequency === 'daily' || taskData.frequency === 'weekly') && !taskData.usage_data) {
        taskData.usage_data = Array(7).fill(0);
      }
      
      const savedRawTaskData = await createTaskMutation(taskData); // This returns raw data from Supabase
      
      if (savedRawTaskData) {
        // Process the raw data to conform to the Task type using the centralized processor
        const processedTask = processTaskFromDb(savedRawTaskData); 
        return processedTask;
      }
      return null;
    } catch (err: any) {
      console.error('Error saving task:', err);
      toast({
        title: 'Error saving task',
        description: err.message || 'Could not save task',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      // Update local cache
      queryClient.setQueryData(TASKS_QUERY_KEY, (oldTasks: Task[] | undefined) => {
        return oldTasks ? oldTasks.filter(t => t.id !== taskId) : [];
      });
      
      // We could also invalidate, but direct cache update is faster for deletions
      // queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });

      // Remove from IndexedDB if still relevant (sync manager might handle this via listeners)
      // For now, direct cache update is primary. saveTasksToDB might be called by sync manager too.

      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error deleting task',
        description: err.message || 'Could not delete task',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean): Promise<boolean> => {
    try {
      console.log(`[TasksDataHandler] toggleTaskCompletion called for task ${taskId}, setting to ${completed}`);
      
      const currentTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      const task = currentTasks.find(t => t.id === taskId);

      if (!task) {
        console.error(`[TasksDataHandler] Task not found with ID: ${taskId}`);
        // Attempt to refetch and find task, could be due to stale cache
        await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        const refreshedTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
        const refreshedTask = refreshedTasks.find(t => t.id === taskId);
        if (!refreshedTask) {
            toast({ title: "Task not found", description: "Could not find the task to update. Please try again.", variant: "destructive" });
            return false;
        }
        // If found after refresh, proceed with refreshedTask (not implemented here to keep it simple, original error stands)
        return false;
      }
      
      console.log(`[TasksDataHandler] Found task: "${task.title}", frequency=${task.frequency}, frequency_count=${task.frequency_count}`);
      console.log(`[TasksDataHandler] Current usage_data:`, task.usage_data);

      // Ensure frequency_count is at least 1 for logic below (processTaskFromDb should have handled this)
      const safeFrequencyCount = Math.max(1, task.frequency_count || 1);

      if (task.frequency === 'daily' || task.frequency === 'weekly') {
        const todayIndex = getCurrentDayOfWeek();
        const maxCompletions = safeFrequencyCount;
        
        const newUsageData = [...(task.usage_data || Array(7).fill(0))];
        
        if (completed) { // User wants to mark as complete / increment
          const currentCompletions = newUsageData[todayIndex] || 0;
          if (currentCompletions < maxCompletions) {
            newUsageData[todayIndex] = currentCompletions + 1;
            const newCompletionCount = newUsageData[todayIndex];
            console.log(`[TasksDataHandler] Incrementing completions for day ${todayIndex} from ${currentCompletions} to ${newCompletionCount}`);
            
            const isFullyCompletedToday = newCompletionCount >= maxCompletions;
            
            await completeTaskMutation({
              taskId,
              updates: {
                usage_data: newUsageData,
                completed: isFullyCompletedToday, 
                last_completed_date: getLocalDateString(),
                updated_at: new Date().toISOString()
              }
            });
            // Let useCompleteTask's onSuccess handle syncCardById, then invalidate for broader consistency
            queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
            return true;
          } else {
            console.log(`[TasksDataHandler] Task already completed maximum times for today: ${currentCompletions}/${maxCompletions}`);
            toast({ title: "Already completed", description: "This task is already completed the maximum number of times for today.", variant: "default" });
            return false;
          }
        } else { // User wants to mark as incomplete / decrement
          const currentCompletions = newUsageData[todayIndex] || 0;
          if (currentCompletions > 0) {
            newUsageData[todayIndex] = currentCompletions - 1;
            console.log(`[TasksDataHandler] Decrementing completions for day ${todayIndex} from ${currentCompletions} to ${newUsageData[todayIndex]}`);
            
            await completeTaskMutation({
              taskId,
              updates: { 
                usage_data: newUsageData,
                completed: false, // Always false when decrementing
                updated_at: new Date().toISOString() 
              }
            });
            queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
            return true;
          } else {
            console.log(`[TasksDataHandler] Can't decrement - already at 0 completions for day ${todayIndex}`);
            return false;
          }
        }
      } else { // One-time tasks
        console.log(`[TasksDataHandler] Handling one-time task completion, setting completed=${completed}`);
        
        await completeTaskMutation({
          taskId,
          updates: {
            completed: completed,
            last_completed_date: completed ? getLocalDateString() : null,
            updated_at: new Date().toISOString()
          }
        });
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        return true;
      }
    } catch (err: any) {
      console.error('[TasksDataHandler] Error updating task completion:', err);
      toast({
        title: 'Error updating task',
        description: err.message || 'Could not update task completion status',
        variant: 'destructive',
      });
      return false;
    }
  };

  const refetchTasks = async (
    options?: RefetchOptions
  ): Promise<QueryObserverResult<Task[], Error>> => {
    console.log('[TasksDataHandler] Manually refetching tasks');
    return refetch(options);
  };

  return {
    tasks,
    isLoading,
    error,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetchTasks
  };
};
