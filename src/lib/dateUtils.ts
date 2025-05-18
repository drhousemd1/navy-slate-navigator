
/** Returns ISO-8601 week string like "2025-W20" **/
export function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Sunday is 0, Monday is 1, etc. Set Sunday to 7 for this calculation.
  const day = d.getUTCDay() || 7; // 1–7 (Mon–Sun)
  // Set date to nearest Thursday: current date + 4 - current day number
  d.setUTCDate(d.getUTCDate() + 4 - day);
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  // Return YYYY-Www
  return `${d.getUTCFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}
