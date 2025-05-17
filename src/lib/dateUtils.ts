
/**
 * Returns the day of the week for a given date.
 * 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
 * @param date The date object.
 * @returns The day of the week as a number.
 */
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};
