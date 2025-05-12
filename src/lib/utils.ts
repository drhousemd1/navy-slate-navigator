
/**
 * Convert a JavaScript day of week (0 = Sunday) to Monday-based (0 = Monday)
 */
export function getMondayBasedDay(): number {
  const date = new Date();
  const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0 = Monday, ..., 6 = Sunday
}
