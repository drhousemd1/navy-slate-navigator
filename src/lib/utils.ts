
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a JavaScript day of week (0 = Sunday) to Monday-based (0 = Monday)
 */
export function getMondayBasedDay(): number {
  const date = new Date();
  const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0 = Monday, ..., 6 = Sunday
}

/**
 * Converts a zero-based index (0 = Sunday) to a Monday-based index (0 = Monday)
 */
export function convertToMondayBasedIndex(sundayBasedIndex: number): number {
  return sundayBasedIndex === 0 ? 6 : sundayBasedIndex - 1;
}

/**
 * Generate an array of dates for a week starting with Monday
 */
export function generateMondayBasedWeekDates(startDate: Date = new Date()): Date[] {
  const result = [];
  const currentDay = startDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate Monday of the week
  const mondayDate = new Date(startDate);
  mondayDate.setDate(startDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  
  // Generate dates for the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    result.push(date);
  }
  
  return result;
}

