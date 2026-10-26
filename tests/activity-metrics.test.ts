import { describe, expect, it } from 'vitest';
import { metricRange, projectActivity, emptyCounts, type MetricEvent, type MetricsSource, type LegacyMetricRecord } from '@/data/metrics/projection';

const monday = '2026-10-26', period = 'period';
const range = (role: 'sub' | 'dom' = 'sub', now = '2026-10-28T12:00:00Z', zone = 'America/Boise') => metricRange('week', role, zone, new Date(now));
const event = (id: string, kind = 'task_completed', role: 'sub' | 'dom' = 'sub', date = monday, overrides: Partial<MetricEvent> = {}): MetricEvent => ({
  id, kind, relationship_id: period, beneficiary_participant_id: role,
  subject: { role }, calendar: { participantId: role, localDate: date, weekStartDate: metricRange('week', role, 'UTC', new Date(`${date}T12:00:00Z`)).start, timeZone: 'America/Boise' },
  reverses_event_id: null, ...overrides,
});
const source = (events: MetricEvent[], legacy: LegacyMetricRecord[] = []): MetricsSource => ({ mode: 'atomic', events, legacy });

describe('Throne activity meaning and immutable evidence', () => {
  it('counts each action, separates Dom/Sub, and keeps totals equal to every bar', () => {
    const events = [event('sub'), event('dom', 'task_completed', 'dom'), event('rule', 'rule_violated'),
      event('sub-use', 'reward_redeemed'), event('dom-use', 'reward_redeemed', 'dom'), event('punish', 'punishment_applied')];
    const result = projectActivity(source(events), [range(), range('dom')]);
    expect(result.totals).toEqual(Object.fromEntries(Object.keys(emptyCounts()).map(key => [key, 1])));
    expect(result.dataArray).toHaveLength(7);
    expect(result.dataArray[0]).toEqual({ date: monday, ...result.totals });
    expect(result.dataArray.slice(1).every(day => Object.keys(emptyCounts()).every(key => day[key] === 0))).toBe(true);
  });
  it('does not count purchases, gifts, refunds, opening balances or inventory as reward use', () => {
    const kinds = ['reward_purchased', 'reward_gifted', 'reward_deleted', 'opening_balance', 'opening_inventory'];
    expect(projectActivity(source(kinds.map(kind => event(kind, kind))), [range()]).totals).toEqual(emptyCounts());
  });
  it('Undo removes the original period contribution even when the correction is recorded later', () => {
    const original = event('original'), undo = event('undo', 'action_undone', 'sub', '2026-11-03', { reverses_event_id: original.id });
    expect(projectActivity(source([original, undo]), [range()]).totals.subTasksCompleted).toBe(0);
    expect(projectActivity(source([original, undo]), [range('sub', '2026-11-03T12:00:00Z')]).totals.subTasksCompleted).toBe(0);
  });
  it('does not infer activity or points from a changed or removed definition or clicking actor', () => {
    const saved = { ...event('original'), actor_participant_id: 'dom', definition_values: { points: 5 }, task_id: 'soft-removed-task' };
    expect(projectActivity(source([saved]), [range(), range('dom')]).totals).toEqual({ ...emptyCounts(), subTasksCompleted: 1 });
  });
  it('keeps pre-upgrade records visible without fabricating historical role/date/points in exact totals', () => {
    const legacy = [{ id: 'old', kind: 'task', recordedAt: '2020-01-01T00:00:00Z', role: 'dom' },
      { id: 'old-use', kind: 'reward', recordedAt: `${monday}T12:00:00Z`, role: 'sub' }] as LegacyMetricRecord[];
    const result = projectActivity(source([event('new')], legacy), [range(), range('dom')]);
    expect(result.totals).toEqual({ ...emptyCounts(), subTasksCompleted: 1 });
    expect(result.retainedLegacy).toEqual({ task: 1, reward: 1, rule: 0, punishment: 0 });
  });
  it('retains legacy current-definition counting only for disabled periods, with unknown records explicit', () => {
    const legacy: LegacyMetricRecord[] = [
      { id: 'sub', kind: 'task', recordedAt: `${monday}T18:00:00Z`, role: 'sub' },
      { id: 'dom', kind: 'reward', recordedAt: `${monday}T18:00:00Z`, role: 'dom' },
      { id: 'missing', kind: 'reward', recordedAt: `${monday}T18:00:00Z`, role: null },
    ];
    const result = projectActivity({ mode: 'legacy', events: [], legacy }, [range(), range('dom')]);
    expect(result.totals).toEqual({ ...emptyCounts(), subTasksCompleted: 1, domRewardsRedeemed: 1 });
    expect(result.unclassifiedLegacy).toBe(1);
  });
  it.each(['task_completed', 'rule_violated', 'punishment_applied', 'reward_redeemed'])('reverses %s once without deleting history', kind => {
    const original = event('original', kind), undo = event('undo', 'action_undone', 'sub', monday, { reverses_event_id: 'original' });
    const events = [original, undo];
    expect(projectActivity(source(events), [range()]).totals).toEqual(emptyCounts());
    expect(events).toHaveLength(2);
  });
  it.each([
    { calendar: null }, { calendar: { participantId: 'someone-else', localDate: monday, weekStartDate: monday, timeZone: 'UTC' } },
    { subject: { role: null } }, { calendar: { participantId: 'sub', localDate: '2026-02-30', weekStartDate: monday, timeZone: 'UTC' } },
  ])('fails visibly on incomplete confirmed calendar/role evidence %j', invalid => {
    expect(() => projectActivity(source([event('bad', 'task_completed', 'sub', monday, invalid as Partial<MetricEvent>)]), [range()])).toThrow();
  });
  it('rejects duplicate history and a reversal whose original was omitted', () => {
    expect(() => projectActivity(source([event('same'), event('same')]), [range()])).toThrow('Duplicate');
    expect(() => projectActivity(source([event('undo', 'action_undone', 'sub', monday, { reverses_event_id: 'missing' })]), [range()])).toThrow('incomplete');
  });
});

describe('saved calendars and non-overlapping periods', () => {
  it('includes Monday at the start and excludes next Monday from both bars and totals', () => {
    const result = projectActivity(source([event('before', 'task_completed', 'sub', '2026-10-25'), event('start'),
      event('last', 'task_completed', 'sub', '2026-11-01'), event('next', 'task_completed', 'sub', '2026-11-02')]), [range()]);
    expect(result.totals.subTasksCompleted).toBe(2);
    expect(result.dataArray[6].subTasksCompleted).toBe(1);
  });
  it('handles Sunday/Monday across two saved timezones without assigning the clicking partner’s week', () => {
    const instant = '2026-10-26T00:30:00Z';
    const ranges = [range('sub', instant, 'America/Boise'), range('dom', instant, 'Europe/London')];
    expect(ranges.map(item => item.start)).toEqual(['2026-10-19', '2026-10-26']);
    const result = projectActivity(source([event('sub', 'task_completed', 'sub', '2026-10-25'), event('dom', 'task_completed', 'dom', monday), event('next-sub')]), ranges);
    expect(result.totals.subTasksCompleted).toBe(1);
    expect(result.totals.domTasksCompleted).toBe(1);
    expect(result.dataArray).toHaveLength(14);
  });
  it('keeps a solo Dom usable without a fabricated Sub clock', () => {
    expect(projectActivity(source([event('dom', 'task_completed', 'dom')]), [range('dom')]).totals.domTasksCompleted).toBe(1);
  });
  it('uses true month/year boundaries, including leap day', () => {
    expect(metricRange('month', 'sub', 'UTC', new Date('2024-02-29T12:00:00Z'))).toMatchObject({ start: '2024-02-01', end: '2024-03-01' });
    expect(metricRange('month', 'sub', 'UTC', new Date('2026-12-31T12:00:00Z'))).toMatchObject({ start: '2026-12-01', end: '2027-01-01' });
    const result = projectActivity(source([event('dec', 'task_completed', 'sub', '2026-12-31'), event('jan', 'task_completed', 'sub', '2027-01-01')]), [metricRange('month', 'sub', 'UTC', new Date('2026-12-31T12:00:00Z'))]);
    expect(result.dataArray).toHaveLength(31);
    expect(result.totals.subTasksCompleted).toBe(1);
  });
  it('uses saved local dates across DST rather than fixed-length UTC weeks', () => {
    const ranges = [range('sub', '2026-11-01T12:00:00Z')];
    expect(ranges[0]).toMatchObject({ start: '2026-10-26', end: '2026-11-02' });
    const legacy: LegacyMetricRecord[] = [
      { id: 'last', kind: 'task', recordedAt: '2026-11-02T06:59:59Z', role: 'sub' },
      { id: 'next', kind: 'task', recordedAt: '2026-11-02T07:00:00Z', role: 'sub' },
    ];
    expect(projectActivity({ mode: 'legacy', events: [], legacy }, ranges).totals.subTasksCompleted).toBe(1);
  });
});
