import type { ActivityArchiveScope, ActivityDomain, RetainedActivityPage, RetainedActivityPeriod, RetainedActivityRow } from '@/data/activityArchive/types';
export const archiveId = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const archiveScope: ActivityArchiveScope = { backendId: 'https://archive.invalid', accountId: archiveId(1), relationshipId: archiveId(2), relationshipSessionId: archiveId(3) };
export const retainedPeriod: RetainedActivityPeriod = { periodId: archiveId(4), startedAt: '2026-01-01T12:00:00Z', endedAt: '2026-10-27T12:00:00Z', label: 'Former partner' };
export const archiveRow = (n = 1, patch: Partial<RetainedActivityRow> = {}): RetainedActivityRow => ({ key: `native:${archiveId(100 + n)}`, source: 'native', kind: 'task_completed',
  timestamp: '2026-10-26T12:00:00Z', title: { text: 'Recorded task title', basis: 'recorded_snapshot' }, role: 'sub', actor: 'former_partner', beneficiary: 'you',
  calendar: { localDate: '2026-10-26', weekStartDate: '2026-10-26', timeZone: 'America/Boise' }, pointEffects: [], reversesKey: null, provenance: 'command', legacy: null, ...patch });
export const archivePage = (rows: RetainedActivityRow[], nextCursor: string | null = null, domain: ActivityDomain = 'task', periodId = retainedPeriod.periodId): RetainedActivityPage => ({
  scope: { currentPeriodId: archiveScope.relationshipId, currentSessionId: archiveScope.relationshipSessionId, retainedPeriodId: periodId, domain }, rows, nextCursor,
});
export function deferredArchive<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
