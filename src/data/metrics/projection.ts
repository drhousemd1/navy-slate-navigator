import { isValidTimezone } from '@/lib/identity';
import type { ActionCalendar, Currency } from '@/domain/actions/types';

export const metricNames = ['subTasksCompleted', 'domTasksCompleted', 'rulesBroken', 'subRewardsRedeemed', 'domRewardsRedeemed', 'punishmentsPerformed'] as const;
export type MetricName = typeof metricNames[number];
export type MetricCounts = Record<MetricName, number>;
export type MetricDay = MetricCounts & { date: string };
export type MetricPeriod = 'week' | 'month';
export type LegacyKind = 'task' | 'rule' | 'reward' | 'punishment';
export interface MetricRange { role: Currency; timeZone: string; start: string; end: string }
export interface MetricEvent {
  id: string; kind: string; relationship_id: string; beneficiary_participant_id: string | null;
  subject: { role: Currency | null }; calendar: ActionCalendar | null;
  reverses_event_id: string | null;
}
export interface LegacyMetricRecord { id: string; kind: LegacyKind; recordedAt: string; role: Currency | null }
export interface MetricsSource { mode: 'atomic' | 'legacy'; events: MetricEvent[]; legacy: LegacyMetricRecord[] }
export interface ActivityMetrics {
  dataArray: MetricDay[]; totals: MetricCounts; ranges: MetricRange[]; mode: 'atomic' | 'legacy';
  /** ALL retained rows in the current relationship, not selected-week activity. */
  retainedLegacy: Record<LegacyKind, number>;
  unclassifiedLegacy: number;
}
export const emptyCounts = (): MetricCounts => ({ subTasksCompleted: 0, domTasksCompleted: 0, rulesBroken: 0,
  subRewardsRedeemed: 0, domRewardsRedeemed: 0, punishmentsPerformed: 0 });
export function validLocalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addDays(date: string, days: number): string {
  if (!validLocalDate(date)) throw new Error('Invalid activity date.');
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
/** Date-only arithmetic: never interpret a saved calendar date in the viewer's timezone. */
export function localDateAt(instant: Date, timeZone: string): string {
  if (!isValidTimezone(timeZone) || !Number.isFinite(instant.getTime())) throw new Error('A valid saved timezone is required for activity.');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
export function metricRange(period: MetricPeriod, role: Currency, timeZone: string, now: Date): MetricRange {
  const date = localDateAt(now, timeZone);
  if (period === 'week') {
    const start = addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
    return { role, timeZone, start, end: addDays(start, 7) };
  }
  const start = `${date.slice(0, 7)}-01`, next = new Date(`${start}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { role, timeZone, start, end: next.toISOString().slice(0, 10) };
}
function keyFor(kind: LegacyKind, role: Currency | null): MetricName | null {
  if (kind === 'rule') return 'rulesBroken';
  if (kind === 'punishment') return 'punishmentsPerformed';
  if (!role) return null;
  return kind === 'task' ? role === 'dom' ? 'domTasksCompleted' : 'subTasksCompleted'
    : role === 'dom' ? 'domRewardsRedeemed' : 'subRewardsRedeemed';
}
const eventKinds: Readonly<Record<string, LegacyKind>> = { task_completed: 'task', rule_violated: 'rule', reward_redeemed: 'reward', punishment_applied: 'punishment' };

export function projectActivity(source: MetricsSource, ranges: MetricRange[]): ActivityMetrics {
  if (!ranges.length || new Set(ranges.map(range => range.role)).size !== ranges.length) throw new Error('Activity calendar is unavailable.');
  const days = new Map<string, MetricDay>();
  for (const range of ranges) for (let date = range.start; date < range.end; date = addDays(date, 1)) {
    if (!days.has(date)) days.set(date, { date, ...emptyCounts() });
  }
  const retainedLegacy = { task: 0, rule: 0, reward: 0, punishment: 0 };
  for (const record of source.legacy) retainedLegacy[record.kind]++;
  let unclassifiedLegacy = 0;
  const count = (kind: LegacyKind, role: Currency | null, date: string) => {
    const range = ranges.find(item => item.role === role), key = keyFor(kind, role);
    if (range && key && date >= range.start && date < range.end) days.get(date)![key]++;
  };
  if (source.mode === 'atomic') {
    const reversed = new Set(source.events.flatMap(event => event.reverses_event_id ? [event.reverses_event_id] : []));
    const seen = new Set<string>();
    for (const event of source.events) {
      if (seen.has(event.id)) throw new Error('Duplicate activity history received.');
      seen.add(event.id);
      const kind = eventKinds[event.kind];
      if (!kind || reversed.has(event.id)) continue;
      const { calendar, subject } = event;
      if (!calendar || !subject.role || calendar.participantId !== event.beneficiary_participant_id ||
          !validLocalDate(calendar.localDate) || !validLocalDate(calendar.weekStartDate) || !isValidTimezone(calendar.timeZone) ||
          new Date(`${calendar.weekStartDate}T00:00:00Z`).getUTCDay() !== 1 ||
          calendar.localDate < calendar.weekStartDate || calendar.localDate >= addDays(calendar.weekStartDate, 7) ||
          ((kind === 'rule' || kind === 'punishment') && subject.role !== 'sub')) throw new Error('Recorded activity calendar or beneficiary could not be verified.');
      // No current definition, clicking actor, price, point amount, or browser clock participates.
      count(kind, subject.role, calendar.localDate);
    }
    if ([...reversed].some(id => !seen.has(id))) throw new Error('Activity correction history is incomplete.');
  } else {
    for (const record of source.legacy) {
      const role = record.kind === 'rule' || record.kind === 'punishment' ? 'sub' : record.role;
      const range = ranges.find(item => item.role === role);
      if (!range || !keyFor(record.kind, role) || !Number.isFinite(Date.parse(record.recordedAt))) { unclassifiedLegacy++; continue; }
      count(record.kind, role, localDateAt(new Date(record.recordedAt), range.timeZone));
    }
  }
  const dataArray = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const totals = dataArray.reduce((total, day) => {
    for (const key of metricNames) total[key] += day[key];
    return total;
  }, emptyCounts());
  return { dataArray, totals, ranges, mode: source.mode, retainedLegacy, unclassifiedLegacy };
}
