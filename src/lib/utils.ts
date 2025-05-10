
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addDays, format, startOfWeek } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the current day of week (0 = Monday, 6 = Sunday)
 * This is different from JavaScript's native getDay() where 0 = Sunday, 6 = Saturday
 */
export function getMondayBasedDay(date: Date = new Date()): number {
  const jsDay = date.getDay(); // JS day (0 = Sunday, 6 = Saturday)
  return jsDay === 0 ? 6 : jsDay - 1; // Convert to Monday-based (0 = Monday, 6 = Sunday)
}

/**
 * Generates an array of dates for the current week, starting with Monday
 */
export function generateMondayBasedWeekDates(): string[] {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start on Monday
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(start, i), 'yyyy-MM-dd')
  );
}

/**
 * Converts JavaScript day index (0=Sunday, 6=Saturday) to Monday-based index (0=Monday, 6=Sunday)
 */
export function convertToMondayBasedIndex(jsDayIndex: number): number {
  return jsDayIndex === 0 ? 6 : jsDayIndex - 1;
}

/**
 * Converts Monday-based index (0=Monday, 6=Sunday) to JavaScript day index (0=Sunday, 6=Saturday)
 */
export function convertToJSDayIndex(mondayBasedIndex: number): number {
  return mondayBasedIndex === 6 ? 0 : mondayBasedIndex + 1;
}
