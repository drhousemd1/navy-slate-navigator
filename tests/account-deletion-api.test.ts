import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://deletion.invalid', supabasePublicKey: 'public-key', supabase: {} }));
import { createDeletionTransport, DeletionError, deletionErrorText } from '@/data/accountDeletion/api';
import { decodeDeletionRecord, decodeDeletionStatus } from '@/data/accountDeletion/types';
import { complete, id, pending, record, scope } from './account-deletion.helpers';
afterEach(() => vi.useRealTimers());
function fixture() { const row = record(); const session = vi.fn().mockResolvedValue({ accountId: scope.accountId, token: 'live-session' }); const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(pending(row.jobId))));
  return { row, session, fetch, api: createDeletionTransport({ backendId: scope.backendId, publicKey: 'public-key', fetch, session, timeoutMs: 30 }) }; }
describe('staged deletion HTTP boundary', () => {
  it('uses one pinned intent and private capability only in the POST body, with public gateway key and checked live bearer', async () => {
    const f = fixture(); await f.api.start(f.row); const [url, init] = f.fetch.mock.calls[0];
    expect(url).toBe(`${scope.backendId}/functions/v1/account-deletion/start`); expect(url).not.toContain(f.row.recoveryToken);
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', apikey: 'public-key', Authorization: 'Bearer live-session' });
    expect(JSON.parse(init.body)).toEqual({ commandId: f.row.jobId, expectedRelationshipId: scope.relationshipId, expectedRelationshipSessionId: scope.relationshipSessionId, recoveryToken: f.row.recoveryToken });
    expect(f.row.recoveryToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it.each(['status', 'resume'] as const)('%s works after Auth is removed and never asks for a live session', async operation => {
    const f = fixture(); f.session.mockResolvedValue(null); await f.api[operation](f.row);
    expect(f.session).not.toHaveBeenCalled(); const [, init] = f.fetch.mock.calls[0]; expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ jobId: f.row.jobId, recoveryToken: f.row.recoveryToken });
  });
  it('does not send start for a different signed-in account or backend', async () => {
    const f = fixture(); f.session.mockResolvedValue({ accountId: id(9), token: 'other' }); await expect(f.api.start(f.row)).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' });
    await expect(f.api.status({ ...f.row, key: JSON.stringify(['https://other.invalid', scope.accountId]), scope: { ...scope, backendId: 'https://other.invalid' } })).rejects.toThrow(); expect(f.fetch).not.toHaveBeenCalled();
  });
  it.each(['session', 'fetch', 'body'])('bounds the entire %s wait and never treats a timeout as completion', async step => {
    vi.useFakeTimers(); const f = fixture(); const never = new Promise(() => {});
    if (step === 'session') f.session.mockReturnValue(never); else if (step === 'fetch') f.fetch.mockReturnValue(never); else f.fetch.mockResolvedValue({ ok: true, json: () => never });
    const waiting = f.api.start(f.row); const assertion = expect(waiting).rejects.toMatchObject({ code: 'DELETION_UNCONFIRMED' }); await vi.advanceTimersByTimeAsync(31); await assertion;
  });
  it('rejects malformed/mismatched terminal results and ignores unsafe server messages', async () => {
    const f = fixture(); for (const value of [{ ...complete(f.row.jobId), jobId: id(9) }, { ...complete(f.row.jobId), completedAt: null }, { ...pending(f.row.jobId), phase: 'complete' }, { ...complete(f.row.jobId), retryAfterMs: 10 }]) {
      f.fetch.mockResolvedValue(new Response(JSON.stringify(value))); await expect(f.api.status(f.row)).rejects.toThrow();
    }
    f.fetch.mockResolvedValue(new Response(JSON.stringify({ error: { code: 'DELETION_BUSY', message: f.row.recoveryToken } }), { status: 409 }));
    let error: unknown; try { await f.api.start(f.row); } catch (value) { error = value; }
    expect(deletionErrorText(error)).toContain('Nothing has been scheduled'); expect(deletionErrorText(error)).not.toContain(f.row.recoveryToken); expect(String(error)).not.toContain(f.row.recoveryToken);
  });
  it('requires terminal server proof before forgetting a token and strips period identifiers from completed notices', () => {
    const row = record(); expect(() => decodeDeletionRecord({ ...row, recoveryToken: null, cleanupComplete: true })).toThrow();
    expect(() => decodeDeletionStatus({ ...pending(row.jobId), completedAt: '2026-01-01T00:00:00Z' }, row.jobId)).toThrow();
    const notice = { ...row, scope: { ...scope, relationshipId: null, relationshipSessionId: null }, recoveryToken: null, cleanupComplete: true, status: complete(row.jobId) };
    expect(decodeDeletionRecord(notice)).toEqual(notice); expect(deletionErrorText(new DeletionError('DELETION_UNAVAILABLE'))).toContain('not confirmation');
  });
});
