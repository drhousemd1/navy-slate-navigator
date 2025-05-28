
import { format, startOfWeek } from 'date-fns';

// Export the Task type and other required types
export interface Task {
  id?: string;
  title: string;
  description?: string;
  points?: number;
  priority?: TaskPriority;
  frequency?: string;
  frequency_count?: number;
  completed?: boolean;
  usage_data?: number[];
  calendar_color?: string;
  icon_name?: string;
  icon_color?: string;
  icon_url?: string;
  title_color?: string;
  subtext_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  last_completed_date?: string;
  week_identifier?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export const getCurrentWeekKey = (): string => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  return format(weekStart, 'yyyy-MM-dd');
};

export const currentWeekKey = getCurrentWeekKey;

export const todayKey = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getMondayBasedDay = (): number => {
  const today = new Date();
  const day = today.getDay();
  // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  return day === 0 ? 6 : day - 1;
};

export const getCurrentDayOfWeek = getMondayBasedDay;

export const resetTaskCompletions = async (frequency: 'daily' | 'weekly') => {
  // Implementation for resetting task completions
  console.log(`Resetting ${frequency} task completions`);
};

export const processTaskFromDb = (task: any): Task => {
  return {
    ...task,
    usage_data: task.usage_data || [],
    points: task.points || 0,
    frequency_count: task.frequency_count || 1,
    completed: Boolean(task.completed),
    priority: task.priority || 'medium',
  };
};

export const processTasksWithRecurringLogic = (tasks: any[]): Task[] => {
  return tasks.map(processTaskFromDb);
};
