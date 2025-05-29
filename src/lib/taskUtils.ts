
import { Task as TaskType, RawSupabaseTask, Json } from '@/data/tasks/types';
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export type { TaskType as Task, RawSupabaseTask, Json };

export const todayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
};

export const currentWeekKey = () => {
  const today = new Date();
  const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  return `${firstDayOfWeek.getFullYear()}-${firstDayOfWeek.getMonth() + 1}-${firstDayOfWeek.getDate()}`;
};

export const currentWeekIdentifier = () => {
  const today = new Date();
  const year = today.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

export const getCurrentDayOfWeek = (): number => {
  return new Date().getDay();
};

export const resetTaskCompletions = async (frequency: 'daily' | 'weekly') => {
  try {
    logger.debug(`[resetTaskCompletions] Resetting ${frequency} task completions`);
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('frequency', frequency)
      .eq('completed', true);

    if (error) {
      logger.error(`[resetTaskCompletions] Error fetching ${frequency} tasks:`, error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      logger.debug(`[resetTaskCompletions] No completed ${frequency} tasks to reset`);
      return;
    }

    const taskIds = tasks.map(task => task.id);
    
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        completed: false,
        last_completed_date: null
      })
      .in('id', taskIds);

    if (updateError) {
      logger.error(`[resetTaskCompletions] Error resetting ${frequency} tasks:`, updateError);
    } else {
      logger.debug(`[resetTaskCompletions] Successfully reset ${tasks.length} ${frequency} tasks`);
    }
  } catch (error) {
    logger.error(`[resetTaskCompletions] Exception during ${frequency} reset:`, error);
  }
};

export const isTaskDueToday = (task: TaskType): boolean => {
  if (task.frequency === 'daily') return true;
  
  if (task.frequency === 'weekly') {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysInWeek = 7;
    const frequencyCount = task.frequency_count || 1;
    
    // Simple logic: task is due if today's day number is divisible by (7/frequencyCount)
    const interval = Math.floor(daysInWeek / frequencyCount);
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
      : 'medium' as const
  };
};
