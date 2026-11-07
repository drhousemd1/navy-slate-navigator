import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://deletion.invalid', supabasePublicKey: 'public', supabase: {} }));
import { useAccountDeletion, DELETION_FOREGROUND_WINDOW_MS } from '@/contexts/auth/useAccountDeletion';
import { DeletionError } from '@/data/accountDeletion/api';
import { complete, deferred, id, identity, MemoryDeletionStore, pending, record, scope } from './account-deletion.helpers';
import type { DeletionStatus } from '@/data/accountDeletion/types';
const transport = { start: vi.fn(), status: vi.fn(), resume: vi.fn() }; const purge = vi.fn(); const endSession = vi.fn(); let store: MemoryDeletionStore;
beforeEach(() => { localStorage.clear(); store = new MemoryDeletionStore(); transport.start.mockReset().mockImplementation(async row => pending(row.jobId)); transport.status.mockReset().mockImplementation(async row => pending(row.jobId));
  transport.resume.mockReset().mockImplementationOnce(async row => ({ ...pending(row.jobId), state: 'retry_required' })).mockImplementation(async row => complete(row.jobId)); purge.mockReset().mockResolvedValue({ legacyPreserved: false }); endSession.mockReset().mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup() { const deps = { store, transport, cleanup: purge }; return renderHook(({ who }) => useAccountDeletion(who.currentUserId, who, endSession, deps), { initialProps: { who: identity() } }); }
async function ready(view: ReturnType<typeof setup>) { await waitFor(() => expect(view.result.current.loading).toBe(false)); }
async function start(view: ReturnType<typeof setup>) { await ready(view); await act(async () => { await view.result.current.start(); }); return view.result.current.records[0]; }
describe('Auth-owned account deletion recovery', () => {
  it('saves recovery and attempted intent durably before sending; pending is never completion', async () => {
    transport.start.mockImplementation(async row => { expect(store.rows.get(row.key)).toEqual(row); expect(row.attempted).toBe(true); return pending(row.jobId); });
    const view = setup(); const row = await start(view); expect(row.status?.state).toBe('retry_required'); expect(row.recoveryToken).toBeTruthy(); expect(purge).not.toHaveBeenCalled(); expect(endSession).not.toHaveBeenCalled();
  });
  it('does not send without durable recovery storage', async () => {
    const view = setup(); await ready(view); store.fail = true; let result; await act(async () => { result = await view.result.current.start(); });
    expect(result.error).toContain('No deletion request was sent'); expect(transport.start).not.toHaveBeenCalled();
  });
  it('recovers a lost response after unmount and Auth loss using the same capability without replaying start', async () => {
    transport.start.mockRejectedValue(new DeletionError('DELETION_UNCONFIRMED')); const first = setup(); const row = await start(first); first.unmount();
    const next = setup(); next.rerender({ who: { ...identity(), currentUserId: null, canAccessData: false } }); await ready(next);
    expect(transport.start).toHaveBeenCalledTimes(1); expect(purge).not.toHaveBeenCalled(); transport.status.mockResolvedValue(complete(row.jobId));
    await act(async () => { await next.result.current.run(next.result.current.records[0], 'status'); });
    expect(transport.status.mock.calls[0][0].recoveryToken).toBe(row.recoveryToken); expect(next.result.current.records[0].cleanupComplete).toBe(true); expect(next.result.current.records[0].recoveryToken).toBeNull();
  });
  it('checks an uncertain saved status before exact same-intent retry, with no new job or token', async () => {
    transport.start.mockRejectedValueOnce(new DeletionError('DELETION_UNCONFIRMED')); const view = setup(); const row = await start(view);
    transport.status.mockRejectedValueOnce(new DeletionError('DELETION_UNAVAILABLE'));
    await act(async () => { await view.result.current.run(row, 'start'); });
    expect(transport.start.mock.calls[1][0]).toEqual(transport.start.mock.calls[0][0]); expect(transport.status).toHaveBeenCalledOnce();
    expect(transport.status.mock.invocationCallOrder[0]).toBeLessThan(transport.start.mock.invocationCallOrder[1]);
  });
  it('does not repeat start when status already proves preparation or when status is unreachable', async () => {
    transport.start.mockRejectedValueOnce(new DeletionError('DELETION_UNCONFIRMED')); const view = setup(); const row = await start(view);
    transport.status.mockRejectedValueOnce(new Error('offline')); await act(async () => { await view.result.current.run(row, 'start'); }); expect(transport.start).toHaveBeenCalledTimes(1);
    await act(async () => { await view.result.current.run(row, 'start'); }); expect(transport.start).toHaveBeenCalledTimes(1); expect(view.result.current.records[0].status?.state).toBe('retry_required');
  });
  it('separates definitive pre-preparation rejection from an unknown job and allows a new review only for the former', async () => {
    transport.start.mockRejectedValueOnce(new DeletionError('DELETION_BUSY')); const view = setup(); const row = await start(view);
    expect(row.startRejected).toBe('DELETION_BUSY'); expect(row.status).toBeNull(); await act(async () => { await view.result.current.dismiss(row); }); expect(view.result.current.records).toHaveLength(0);
    transport.start.mockRejectedValueOnce(new DeletionError('DELETION_UNCONFIRMED')); const unknown = await start(view); await act(async () => { await view.result.current.dismiss(unknown); }); expect(view.result.current.records).toHaveLength(1);
  });
  it('honors the server retry interval and retains retry_required jobs', async () => {
    transport.start.mockImplementation(async row => ({ ...pending(row.jobId), state: 'retry_required', retryAfterMs: 90_000 })); const view = setup(); const row = await start(view);
    await act(async () => { await view.result.current.run(row, 'resume'); await view.result.current.run(row, 'status'); }); expect(transport.resume).not.toHaveBeenCalled(); expect(transport.status).not.toHaveBeenCalled(); expect(row.recoveryToken).toBeTruthy();
  });
  it('keeps the capability after failed local cleanup, retries only cleanup, then preserves a nonsecret legacy notice', async () => {
    const view = setup(); const row = await start(view); purge.mockRejectedValueOnce(new Error('disk'));
    await act(async () => { await view.result.current.run(row, 'resume'); }); const incomplete = view.result.current.records[0]; expect(incomplete.status?.state).toBe('complete'); expect(incomplete.recoveryToken).toBeTruthy(); expect(incomplete.cleanupComplete).toBe(false);
    purge.mockResolvedValue({ legacyPreserved: true }); await act(async () => { await view.result.current.run(incomplete, 'cleanup'); });
    const notice = view.result.current.records[0]; expect(notice).toMatchObject({ recoveryToken: null, cleanupComplete: true, legacyPreserved: true, scope: { relationshipId: null, relationshipSessionId: null } }); expect(transport.resume).toHaveBeenCalledTimes(2);
  });
  it('does not infer completion from logout, malformed response, or a different job', async () => {
    transport.start.mockImplementation(async row => complete(id(99))); const view = setup(); const row = await start(view);
    expect(row.status).toBeNull(); view.rerender({ who: { ...identity(), currentUserId: null, canAccessData: false } }); expect(purge).not.toHaveBeenCalled(); expect(endSession).not.toHaveBeenCalled();
  });
  it('will not resubmit a pending start in a different same-account connection or account', async () => {
    transport.start.mockRejectedValue(new Error('offline')); const view = setup(); const row = await start(view);
    view.rerender({ who: { ...identity(), relationshipSessionId: id(90) } }); expect(view.result.current.canRetryStart(row)).toBe(false); await act(async () => { await view.result.current.run(row, 'start'); });
    view.rerender({ who: { ...identity(), currentUserId: id(91) } }); await act(async () => { await view.result.current.run(row, 'start'); }); expect(transport.start).toHaveBeenCalledOnce();
  });
  it('preserves a late server confirmation after unmount for recovery without running local cleanup while unmounted', async () => {
    const wait = deferred<DeletionStatus>(); transport.start.mockReturnValue(wait.promise); const view = setup(); await ready(view);
    let operation: Promise<unknown>; act(() => { operation = view.result.current.start(); }); await waitFor(() => expect(transport.start).toHaveBeenCalledOnce()); const row = transport.start.mock.calls[0][0]; view.unmount();
    await act(async () => { wait.resolve(complete(row.jobId)); await operation; }); expect([...store.rows.values()][0].status?.state).toBe('complete'); expect(purge).not.toHaveBeenCalled();
  });
  it('advances the exact saved job through multiple pending steps within one gesture, honoring every delay', async () => {
    const view = setup(); await ready(view); vi.useFakeTimers();
    transport.start.mockImplementation(async row => ({ ...pending(row.jobId), retryAfterMs: 1000 }));
    transport.resume.mockReset().mockImplementationOnce(async row => ({ ...pending(row.jobId), retryAfterMs: 1000 })).mockImplementation(async row => complete(row.jobId));
    let operation: Promise<unknown>; act(() => { operation = view.result.current.start(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); }); expect(transport.resume).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(999); }); expect(transport.resume).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); }); expect(transport.resume).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); await operation; }); expect(transport.resume).toHaveBeenCalledTimes(2);
    const sent = transport.start.mock.calls[0][0]; for (const [row] of transport.resume.mock.calls) { expect(row.jobId).toBe(sent.jobId); expect(row.recoveryToken).toBe(sent.recoveryToken); }
    expect(view.result.current.records[0].cleanupComplete).toBe(true);
  });
  it('pauses a foreground session at its time limit without a scheduler or a new intent', async () => {
    const view = setup(); await ready(view); vi.useFakeTimers(); transport.start.mockImplementation(async row => ({ ...pending(row.jobId), retryAfterMs: DELETION_FOREGROUND_WINDOW_MS + 1000 }));
    let operation: Promise<unknown>; act(() => { operation = view.result.current.start(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(DELETION_FOREGROUND_WINDOW_MS); await operation; });
    const row = view.result.current.records[0]; expect(row.status?.state).toBe('pending'); expect(view.result.current.errors[row.jobId]).toContain('paused'); expect(transport.resume).not.toHaveBeenCalled(); expect(row.recoveryToken).toBeTruthy();
  });
  it('stops its pending loop on provider unmount and restores only explicit recovery controls', async () => {
    const view = setup(); await ready(view); vi.useFakeTimers(); transport.start.mockImplementation(async row => ({ ...pending(row.jobId), retryAfterMs: 1000 }));
    let operation: Promise<unknown>; act(() => { operation = view.result.current.start(); }); await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    view.unmount(); await act(async () => { await operation; await vi.advanceTimersByTimeAsync(5000); }); expect(transport.resume).not.toHaveBeenCalled(); expect([...store.rows.values()][0].status?.state).toBe('pending');
  });

});
