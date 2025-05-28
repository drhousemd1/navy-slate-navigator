
import { format, startOfWeek } from 'date-fns';

export const getCurrentWeekKey = (): string => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  return format(weekStart, 'yyyy-MM-dd');
};

export const currentWeekKey = getCurrentWeekKey;

export const getMondayBasedDay = (): number => {
  const today = new Date();
  const day = today.getDay();
  // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  return day === 0 ? 6 : day - 1;
};

export const resetTaskCompletions = async (frequency: 'daily' | 'weekly') => {
  // Implementation for resetting task completions
  console.log(`Resetting ${frequency} task completions`);
};
