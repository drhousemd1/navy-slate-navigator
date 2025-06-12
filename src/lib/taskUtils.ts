import { Task as TaskType, RawSupabaseTask, Json } from '@/data/tasks/types';
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { saveTasksToDB, loadTasksFromDB } from '../data/indexedDB/useIndexedDB';
import { getISOWeekString } from './dateUtils';

export type { TaskType as Task, RawSupabaseTask, Json };

/**
 * Get current date in ISO format (YYYY-MM-DD) using local timezone
 */
export const todayKey = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in local timezone
};

/**
 * Get current week identifier in Monday-based ISO format (YYYY-Www)
 */
export const currentWeekKey = (): string => {
  return getISOWeekString(new Date());
};

/**
 * Get current week identifier (alias for consistency)
 */
export const currentWeekIdentifier = (): string => {
  return currentWeekKey();
};

/**
 * Get current day of week (0 = Monday, 6 = Sunday)
 */
export const getCurrentDayOfWeek = (): number => {
  const today = new Date();
  const jsDay = today.getDay(); // JS day (0 = Sunday, 6 = Saturday)
  return jsDay === 0 ? 6 : jsDay - 1; // Convert to Monday-based (0 = Monday, 6 = Sunday)
};

/**
 * Enhanced reset function that clears ALL tasks of a frequency, regardless of completion status
 */
export const resetTaskCompletions = async (frequency: 'daily' | 'weekly') => {
  try {
    logger.debug(`[resetTaskCompletions] Starting ${frequency} task reset for ALL tasks`);
    
    // Get current user session to ensure proper filtering
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      logger.debug('[resetTaskCompletions] No authenticated user, skipping reset');
      return;
    }

    // Get ALL tasks of the specified frequency, not just completed ones
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('frequency', frequency)
      .eq('user_id', session.user.id); // Ensure user-scoped query

    if (error) {
      logger.error(`[resetTaskCompletions] Error fetching ${frequency} tasks:`, error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      logger.debug(`[resetTaskCompletions] No ${frequency} tasks found to reset`);
      return;
    }

    logger.debug(`[resetTaskCompletions] Found ${tasks.length} ${frequency} tasks to reset`);

    // Reset ALL tasks of this frequency - clear completion status, usage_data, and last_completed_date
    const { data: updatedTasks, error: updateError } = await supabase
      .from('tasks')
      .update({ 
        completed: false,
        last_completed_date: null,
        usage_data: [] // Clear the usage tracking data
      })
      .in('id', tasks.map(task => task.id))
      .eq('user_id', session.user.id) // Ensure user-scoped update
      .select('*');

    if (updateError) {
      logger.error(`[resetTaskCompletions] Error resetting ${frequency} tasks:`, updateError);
      throw updateError;
    }

    logger.debug(`[resetTaskCompletions] Successfully reset ${tasks.length} ${frequency} tasks`);

    // CRITICAL: Immediately sync the updated data to IndexedDB
    if (updatedTasks) {
      logger.debug(`[resetTaskCompletions] Syncing ${updatedTasks.length} updated tasks to IndexedDB`);
      
      // Load current tasks from IndexedDB
      const currentLocalTasks = await loadTasksFromDB() || [];
      
      // Update the local tasks with the reset tasks
      const updatedLocalTasks = currentLocalTasks.map(localTask => {
        const resetTask = updatedTasks.find(ut => ut.id === localTask.id);
        return resetTask ? resetTask : localTask;
      });
      
      // Save back to IndexedDB
      await saveTasksToDB(updatedLocalTasks);
      logger.debug(`[resetTaskCompletions] Successfully synced reset data to IndexedDB`);
    }
    
  } catch (error) {
    logger.error(`[resetTaskCompletions] Exception during ${frequency} reset:`, error);
    throw error;
  }
};

/**
 * Check and perform task resets if needed
 */
export const checkAndPerformTaskResets = async (): Promise<boolean> => {
  let resetPerformed = false;
  
  try {
    // Check daily reset
    const lastDaily = localStorage.getItem("lastDaily");
    const currentDaily = todayKey();
    
    if (lastDaily !== currentDaily) {
      logger.debug(`[checkAndPerformTaskResets] Performing daily reset: ${lastDaily} -> ${currentDaily}`);
      await resetTaskCompletions("daily");
      localStorage.setItem("lastDaily", currentDaily);
      resetPerformed = true;
    }
    
    // Check weekly reset
    const lastWeekly = localStorage.getItem("lastWeek");
    const currentWeekly = currentWeekKey();
    
    if (lastWeekly !== currentWeekly) {
      logger.debug(`[checkAndPerformTaskResets] Performing weekly reset: ${lastWeekly} -> ${currentWeekly}`);
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekly);
      resetPerformed = true;
    }
    
    return resetPerformed;
  } catch (error) {
    logger.error(`[checkAndPerformTaskResets] Error during reset check:`, error);
    return false;
  }
};

export const isTaskDueToday = (task: TaskType): boolean => {
  if (task.frequency === 'daily') return true;
  
  if (task.frequency === 'weekly') {
    const today = getCurrentDayOfWeek(); // 0 = Monday, 6 = Sunday
    const frequencyCount = task.frequency_count || 1;
    
    // Simple logic: task is due if today's day number is divisible by (7/frequencyCount)
    const interval = Math.floor(7 / frequencyCount);
    return today % interval === 0;
  }
  
  return false;
};

export const calculateTaskProgress = (task: TaskType): number => {
  if (!Array.isArray(task.usage_data)) return 0;
  
  const completedDays = task.usage_data.filter((day: Json) => typeof day === 'number' && day > 0).length;
  const totalDays = task.frequency === 'daily' ? 7 : task.frequency_count || 1;
  
  return Math.min(100, (completedDays / totalDays) * 100);
};

export const getTaskPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

export const transformSupabaseTask = (rawTask: RawSupabaseTask): TaskType => {
  return {
    ...rawTask,
    priority: (rawTask.priority === 'low' || rawTask.priority === 'medium' || rawTask.priority === 'high') 
      ? rawTask.priority 
      : 'medium' as const,
    frequency: (rawTask.frequency === 'daily' || rawTask.frequency === 'weekly' || rawTask.frequency === 'monthly')
      ? rawTask.frequency 
      : 'daily' as const
  };
};
