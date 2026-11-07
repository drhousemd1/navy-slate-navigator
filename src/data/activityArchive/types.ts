import { z } from 'zod';

export const activityDomains = ['task', 'reward', 'rule', 'punishment'] as const;
export type ActivityDomain = typeof activityDomains[number];
export interface ActivityArchiveScope { backendId: string; accountId: string; relationshipId: string; relationshipSessionId: string }
export const archiveScopeKey = (scope: ActivityArchiveScope | null) => scope
  ? JSON.stringify([scope.backendId, scope.accountId, scope.relationshipId, scope.relationshipSessionId]) : '';
const uuid = z.string().uuid();
const instant = z.string().datetime({ offset: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const time = new Date(`${value}T00:00:00Z`); return Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === value;
});
const zone = z.string().refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } });
const calendar = z.object({ localDate: date, weekStartDate: date, timeZone: zone }).strict();
const person = z.enum(['you', 'former_partner', 'deleted_account', 'not_recorded']);
const key = z.string().regex(/^(?:native|imported):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const period = z.object({ periodId: uuid, startedAt: instant, endedAt: instant.nullable(),
  label: z.enum(['Former partner', 'Deleted account', 'Earlier solo period']) }).strict();
const currentScope = z.object({ currentPeriodId: uuid, currentSessionId: uuid }).strict();
const periodsResponse = z.object({ scope: currentScope, periods: z.array(period) }).strict();
const row = z.object({ key, source: z.enum(['native', 'imported']), kind: z.string().min(1), timestamp: instant.nullable(),
  title: z.object({ text: z.string().nullable(), basis: z.enum(['recorded_snapshot', 'current_reference', 'unavailable']) }).strict(),
  role: z.enum(['dom', 'sub']).nullable(), actor: person, beneficiary: person, calendar: calendar.nullable(),
  pointEffects: z.array(z.object({ person: z.enum(['you', 'former_partner', 'deleted_account']), currency: z.enum(['dom', 'sub']),
    amount: z.number().int().safe(), calendar: calendar.nullable() }).strict()).nullable(),
  reversesKey: key.nullable(), provenance: z.string().min(1),
  legacy: z.object({ used: z.boolean().nullable().optional(), dayOfWeek: z.number().int().nullable().optional(),
    weekNumber: z.string().nullable().optional(), pointsDeducted: z.number().finite().nullable().optional() }).strict().nullable(),
}).strict();
const historyResponse = z.object({ scope: currentScope.extend({ retainedPeriodId: uuid, domain: z.enum(activityDomains) }).strict(),
  rows: z.array(row).max(30), nextCursor: z.string().min(1).nullable() }).strict();
export type RetainedActivityPeriod = z.infer<typeof period>;
export type RetainedActivityRow = z.infer<typeof row>;
export type RetainedActivityPage = z.infer<typeof historyResponse>;

function assertScope(actual: z.infer<typeof currentScope>, expected: ActivityArchiveScope) {
  if (actual.currentPeriodId !== expected.relationshipId || actual.currentSessionId !== expected.relationshipSessionId) throw new Error('INVALID_ACTIVITY_RESPONSE');
}
export function decodeRetainedPeriods(value: unknown, scope: ActivityArchiveScope): RetainedActivityPeriod[] {
  const result = periodsResponse.parse(value); assertScope(result.scope, scope);
  if (result.periods.some(period => period.periodId === scope.relationshipId) || new Set(result.periods.map(period => period.periodId)).size !== result.periods.length) throw new Error('INVALID_ACTIVITY_RESPONSE');
  return result.periods;
}
export function decodeRetainedHistory(value: unknown, scope: ActivityArchiveScope, periodId: string, domain: ActivityDomain, cursor: string | null): RetainedActivityPage {
  const result = historyResponse.parse(value); assertScope(result.scope, scope);
  if (result.scope.retainedPeriodId !== periodId || result.scope.domain !== domain || result.nextCursor === cursor && cursor !== null ||
    result.nextCursor !== null && result.rows.length === 0 || new Set(result.rows.map(row => row.key)).size !== result.rows.length) throw new Error('INVALID_ACTIVITY_RESPONSE');
  for (const row of result.rows) {
    if (!row.key.startsWith(`${row.source}:`) || row.reversesKey && (!row.reversesKey.startsWith('native:') || row.reversesKey === row.key) ||
      (row.title.basis === 'unavailable') !== (row.title.text === null)) throw new Error('INVALID_ACTIVITY_RESPONSE');
    if (row.source === 'imported' && (row.actor !== 'not_recorded' || row.beneficiary !== 'not_recorded' || row.role !== null || row.calendar !== null || row.pointEffects !== null || row.reversesKey !== null || row.provenance !== 'legacy_record')) throw new Error('INVALID_ACTIVITY_RESPONSE');
    if (row.source === 'native' && row.pointEffects === null) throw new Error('INVALID_ACTIVITY_RESPONSE');
  }
  return result;
}
