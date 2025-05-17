
/**
 * Returns the day of the week for a given date.
 * 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
 * @param date The date object.
 * @returns The day of the week as a number.
 */
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};

/**
 * Converts JavaScript day index (0=Sunday, 6=Saturday) to Monday-based index (0=Monday, 6=Sunday).
 * @param jsDayIndex The JavaScript day index (0-6, Sunday-Saturday).
 * @returns The Monday-based day index (0-6, Monday-Sunday).
 */
export const getMondayBasedIndex = (jsDayIndex: number): number => {
  // Sunday (0) becomes 6, Monday (1) becomes 0, ..., Saturday (6) becomes 5.
  return jsDayIndex === 0 ? 6 : jsDayIndex - 1;
};

