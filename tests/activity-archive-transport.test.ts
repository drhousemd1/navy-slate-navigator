import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://archive.invalid', supabase: {} }));
import { createActivityArchiveTransport } from '@/data/activityArchive/transport';
import { decodeRetainedHistory, decodeRetainedPeriods } from '@/data/activityArchive/types';
import { archiveId, archivePage, archiveRow, archiveScope as scope, deferredArchive, retainedPeriod } from './activity-archive.helpers';

const periods = () => ({ scope: { currentPeriodId: scope.relationshipId, currentSessionId: scope.relationshipSessionId }, periods: [retainedPeriod] });
const session = vi.fn(); const rpc = vi.fn(); const identity = vi.fn();
const make = () => createActivityArchiveTransport({ backendId: scope.backendId, session, rpc, identity, timeoutMs: 100 });
beforeEach(() => {
  session.mockReset().mockResolvedValue({ accountId: scope.accountId, token: 'checked-token' });
  rpc.mockReset().mockResolvedValue({ data: periods(), error: null });
  identity.mockReset().mockResolvedValue({ currentUserId: scope.accountId, canAccessData: true, relationshipId: scope.relationshipId, relationshipSessionId: scope.relationshipSessionId });
});
afterEach(() => vi.useRealTimers());

describe('retained activity read boundary', () => {
  it('pins the account token, scopes both reads, and rechecks the current identity before returning', async () => {
    const transport = make(); expect(await transport.periods(scope)).toEqual([retainedPeriod]);
    expect(rpc.mock.calls[0].slice(0, 3)).toEqual(['list_my_retained_activity_periods', { p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId }, 'checked-token']);
    expect(identity).toHaveBeenCalledWith(scope.accountId, 'checked-token', expect.any(AbortSignal));
    rpc.mockResolvedValue({ data: archivePage([archiveRow()], 'opaque-next', 'punishment'), error: null });
    await transport.history(scope, retainedPeriod.periodId, 'punishment', 'opaque-previous');
    expect(rpc.mock.calls[1][1]).toEqual({ p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId,
      p_retained_relationship_id: retainedPeriod.periodId, p_domain: 'punishment', p_cursor: 'opaque-previous', p_limit: 30 });
    expect(session).toHaveBeenCalledTimes(6);
  });
  it('sends no request for another backend or account and rejects a changed connection after a response', async () => {
    expect(() => make().periods({ ...scope, backendId: 'https://other.invalid' })).toThrow('ACCOUNT_CHANGED');
    session.mockResolvedValue({ accountId: archiveId(9), token: 'other-account' });
    await expect(make().periods(scope)).rejects.toThrow('ACCOUNT_CHANGED'); expect(rpc).not.toHaveBeenCalled();
    session.mockResolvedValue({ accountId: scope.accountId, token: 'checked-token' });
    identity.mockResolvedValue({ currentUserId: scope.accountId, canAccessData: true, relationshipId: scope.relationshipId, relationshipSessionId: archiveId(99) });
    await expect(make().periods(scope)).rejects.toThrow('STALE_RELATIONSHIP_SESSION');
  });
  it('rejects an account switch during the final identity read', async () => {
    identity.mockImplementation(async () => { session.mockResolvedValue({ accountId: archiveId(9), token: 'next-account' }); return { currentUserId: scope.accountId, canAccessData: true, relationshipId: scope.relationshipId, relationshipSessionId: scope.relationshipSessionId }; });
    await expect(make().periods(scope)).rejects.toThrow('ACCOUNT_CHANGED');
  });
  it('bounds the initial session lookup and never sends its late request', async () => {
    vi.useFakeTimers(); const pending = deferredArchive<{ accountId: string; token: string }>(); session.mockReturnValue(pending.promise);
    const assertion = expect(make().periods(scope)).rejects.toThrow('ACTIVITY_TIMEOUT');
    await vi.advanceTimersByTimeAsync(101); await assertion;
    pending.resolve({ accountId: scope.accountId, token: 'late' }); await vi.runAllTimersAsync(); expect(rpc).not.toHaveBeenCalled();
  });
  it('uses the same deadline for the final identity check and cancels caller-aborted reads', async () => {
    vi.useFakeTimers(); identity.mockReturnValue(new Promise(() => {}));
    const assertion = expect(make().periods(scope)).rejects.toThrow('ACTIVITY_TIMEOUT'); await vi.advanceTimersByTimeAsync(101); await assertion;
    expect(identity.mock.calls[0][2].aborted).toBe(true);
    const controller = new AbortController(); const result = make().periods(scope, controller.signal);
    controller.abort(); await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('preserves known server context failures for a choice refresh rather than automatic replay', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'RETAINED_PERIOD_NOT_ARCHIVED' } });
    await expect(make().history(scope, retainedPeriod.periodId, 'task')).rejects.toMatchObject({ code: 'RETAINED_PERIOD_NOT_ARCHIVED' });
    expect(identity).not.toHaveBeenCalled();
  });
});

describe('retained DTO validation', () => {
  it('rejects current/duplicate periods and mismatched session, period or domain responses', () => {
    expect(() => decodeRetainedPeriods({ ...periods(), periods: [{ ...retainedPeriod, periodId: scope.relationshipId }] }, scope)).toThrow();
    expect(() => decodeRetainedPeriods({ ...periods(), periods: [retainedPeriod, retainedPeriod] }, scope)).toThrow();
    const valid = archivePage([archiveRow()]);
    for (const patch of [{ currentSessionId: archiveId(99) }, { retainedPeriodId: archiveId(99) }, { domain: 'reward' }]) {
      expect(() => decodeRetainedHistory({ ...valid, scope: { ...valid.scope, ...patch } }, scope, retainedPeriod.periodId, 'task', null)).toThrow();
    }
  });
  it('preserves zero effects and imported false/null values without interpreting unknowns as no effects', () => {
    const original = archiveRow(1, { pointEffects: [{ person: 'you', currency: 'sub', amount: 0, calendar: null }, { person: 'former_partner', currency: 'dom', amount: 4, calendar: null }] });
    const imported = archiveRow(2, { key: `imported:${archiveId(102)}`, source: 'imported', kind: 'reward_use_record', timestamp: null,
      title: { text: null, basis: 'unavailable' }, role: null, actor: 'not_recorded', beneficiary: 'not_recorded', calendar: null, pointEffects: null,
      provenance: 'legacy_record', legacy: { used: false, dayOfWeek: 0, weekNumber: null, pointsDeducted: 0 } });
    const decoded = decodeRetainedHistory(archivePage([original, imported], null, 'reward'), scope, retainedPeriod.periodId, 'reward', null);
    expect(decoded.rows).toEqual([original, imported]); expect(decoded.rows[0].pointEffects?.[0].amount).toBe(0); expect(decoded.rows[1].pointEffects).toBeNull();
  });
  it('rejects leaked identity fields, fabricated imported effects and broken pagination', () => {
    const row = archiveRow();
    for (const changed of [{ ...row, participantId: archiveId(9) }, { ...row, pointEffects: [{ person: 'you', currency: 'sub', amount: 1, calendar: null, userId: archiveId(9) }] }, { ...row, source: 'imported', key: `imported:${archiveId(101)}` }]) {
      expect(() => decodeRetainedHistory(archivePage([changed as typeof row]), scope, retainedPeriod.periodId, 'task', null)).toThrow();
    }
    expect(() => decodeRetainedHistory(archivePage([row, row]), scope, retainedPeriod.periodId, 'task', null)).toThrow();
    expect(() => decodeRetainedHistory(archivePage([row], 'same'), scope, retainedPeriod.periodId, 'task', 'same')).toThrow();
    expect(() => decodeRetainedHistory(archivePage([], 'next'), scope, retainedPeriod.periodId, 'task', null)).toThrow();
  });
});
