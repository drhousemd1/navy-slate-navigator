import type { WellbeingSnapshot } from './types';
export function localDateAt(timezone: string, at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}
export function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10);
}
export function dateRange(date: string, monthly: boolean) {
  const value = new Date(`${date}T12:00:00Z`);
  const start = monthly ? `${date.slice(0, 7)}-01` : addDays(date, -((value.getUTCDay() + 6) % 7));
  if (monthly) { value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() + 1); }
  const end = monthly ? value.toISOString().slice(0, 10) : addDays(start, 7);
  const dates: string[] = []; for (let day = start; day < end; day = addDays(day, 1)) dates.push(day);
  return { start, end, dates };
}

const displayTime = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'unknown time';
export const checkinTime = (row: WellbeingSnapshot) => row.provenance === 'legacy_snapshot'
  ? `Imported status · last updated ${displayTime(row.legacyUpdatedAt)} · original timezone unknown`
  : `Recorded ${row.localDate} in ${row.timezone} · ${displayTime(row.recordedAt)}`;
export const legacyCreatedTime = (row: WellbeingSnapshot) => displayTime(row.legacyCreatedAt);
