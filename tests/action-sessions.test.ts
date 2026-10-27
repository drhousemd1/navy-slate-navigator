import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionCommandQueue } from '@/data/actions/queue';
import { decodeActionReceipt, decodeActionScope, decodeQueueEntry, scopeKey, type QueueEntry, type StoredActionScope } from '@/data/actions/contracts';
import { createActionTransport } from '@/data/actions/transport';
import { withCurrentVerification } from '@/lib/offline/verified-transport';
import { emptyIdentity } from '@/lib/identity';
import { command, deferred, MemoryQueueStore, receipt, scope, TestConnection, uuid } from './action-queue.helpers';

const legacyScope = (): StoredActionScope => { const { relationshipSessionId: _session, ...stored } = scope; return stored; };
const legacyReceipt = () => { const { relationshipSessionId: _session, ...stored } = receipt(); return stored; };
const original = (stored = legacyScope()): QueueEntry => ({ version: 1, sequence: 1, scope: stored, command,
  createdAt: 1, updatedAt: 1, state: { status: 'pending', command }, attempts: 0, everSent: false, nextAttemptAt: 1, problem: null, lease: null });
const queues: ActionCommandQueue[] = [];
function fixture(row = original()) {
  const store = new MemoryQueueStore(); store.records.set(command.commandId, structuredClone(row));
  const connection = new TestConnection();
  const execute = vi.fn().mockResolvedValue({ kind: 'confirmed', receipt: receipt() });
  const readReceipt = vi.fn().mockResolvedValue({ kind: 'confirmed', receipt: legacyReceipt() });
  const onConfirmed = vi.fn();
  const queue = new ActionCommandQueue({ store, connection, transport: { backendId: scope.backendId, execute, readReceipt }, onConfirmed, requestTimeoutMs: 100, leaseMs: 300 });
  queues.push(queue); queue.setContext(scope);
  return { queue, store, connection, execute, readReceipt, onConfirmed };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T12:00:00Z')); });
afterEach(() => { for (const queue of queues.splice(0)) queue.dispose(); vi.useRealTimers(); });
describe('version-1 preservation and session isolation', () => {
  it('reads original pending and confirmed records without adding inferred fields or changing bytes', () => {
    const pending = original();
    const confirmed: QueueEntry = { ...pending, state: { status: 'confirmed', receipt: legacyReceipt() }, everSent: true, attempts: 1 };
    for (const row of [pending, confirmed]) {
      const serialized = JSON.stringify(row);
      expect(JSON.stringify(decodeQueueEntry(JSON.parse(serialized)))).toBe(serialized);
      expect(decodeQueueEntry(row).scope).not.toHaveProperty('relationshipSessionId');
    }
    expect(() => decodeActionScope(legacyScope())).toThrow();
    expect(() => decodeActionScope({ ...scope, relationshipSessionId: null })).toThrow();
    expect(scopeKey(legacyScope())).not.toBe(scopeKey(scope));
  });
  it.each(['missing', 'older'] as const)('keeps %s session rows after recreation and cannot send, cancel, or rebind them on Continue', async kind => {
    const row = original(kind === 'missing' ? legacyScope() : { ...scope, relationshipSessionId: uuid(999) });
    const first = fixture(row); const bytes = JSON.stringify(await first.store.list()); first.queue.dispose();
    const reloaded = fixture(JSON.parse(bytes)[0]); reloaded.connection.online = true; await reloaded.queue.flush();
    expect(reloaded.execute).not.toHaveBeenCalled();
    expect((await reloaded.queue.list())[0]).toMatchObject({ canReplay: false, canCancel: false, canReconcile: true });
    await expect(reloaded.queue.retry(command.commandId)).rejects.toThrow();
    expect(await reloaded.queue.cancelUnsent(command.commandId)).toBe(false);
    expect(JSON.stringify(await reloaded.store.list())).toBe(bytes);
  });
  it('recovers an exact owned historical receipt without an execute, inferred session, altered attempt count or success callback', async () => {
    const f = fixture();
    expect(await f.queue.reconcile(command.commandId)).toBe('confirmed');
    const row = (await f.store.list())[0];
    expect(row).toMatchObject({ command, scope: legacyScope(), state: { status: 'confirmed', receipt: legacyReceipt() }, attempts: 0, everSent: false, receiptRecoveredAt: Date.now() });
    expect(row.scope).not.toHaveProperty('relationshipSessionId');
    expect(f.execute).not.toHaveBeenCalled(); expect(f.onConfirmed).not.toHaveBeenCalled();
    expect(JSON.stringify(decodeQueueEntry(JSON.parse(JSON.stringify(row))))).toBe(JSON.stringify(row));
  });
  it('keeps a missing receipt exactly unchanged and never falls through to execute', async () => {
    const f = fixture(); const bytes = JSON.stringify(await f.store.list()); f.readReceipt.mockResolvedValue({ kind: 'not_found' });
    expect(await f.queue.reconcile(command.commandId)).toBe('not_found');
    expect(JSON.stringify(await f.store.list())).toBe(bytes); expect(f.execute).not.toHaveBeenCalled();
  });
  it('does not recover another account/backend and suppresses lookup results after an account switch', async () => {
    const f = fixture(); const bytes = JSON.stringify(await f.store.list());
    f.queue.setContext({ ...scope, accountId: uuid(22) });
    expect(await f.queue.list()).toEqual([]); await expect(f.queue.reconcile(command.commandId)).rejects.toThrow(); expect(f.readReceipt).not.toHaveBeenCalled();
    f.queue.setContext(scope); const response = deferred<ReturnType<typeof f.readReceipt>>(); f.readReceipt.mockReturnValue(response.promise);
    const lookup = f.queue.reconcile(command.commandId); await Promise.resolve(); await Promise.resolve();
    f.queue.setContext({ ...scope, accountId: uuid(23) }); response.resolve({ kind: 'confirmed', receipt: legacyReceipt() });
    await expect(lookup).rejects.toThrow(/changed|unavailable/); expect(JSON.stringify(await f.store.list())).toBe(bytes);
  });
  it('rejects wrong command/session receipts and a timed-out lookup without rewriting stored work', async () => {
    const f = fixture(original({ ...scope, relationshipSessionId: uuid(999) })); const bytes = JSON.stringify(await f.store.list());
    f.readReceipt.mockResolvedValue({ kind: 'confirmed', receipt: receipt() });
    await expect(f.queue.reconcile(command.commandId)).rejects.toThrow('session');
    f.readReceipt.mockReturnValue(new Promise(() => {})); const lookup = f.queue.reconcile(command.commandId);
    const assertion = expect(lookup).rejects.toThrow('could not be checked'); await vi.advanceTimersByTimeAsync(101); await assertion;
    expect(JSON.stringify(await f.store.list())).toBe(bytes); expect(f.execute).not.toHaveBeenCalled();
  });
  it('requires the exact new session on live receipts while accepting omission only for historical parsing', () => {
    expect(decodeActionReceipt(legacyReceipt(), command)).not.toHaveProperty('relationshipSessionId');
    expect(() => decodeActionReceipt(legacyReceipt(), command, scope.relationshipSessionId)).toThrow('session');
    expect(() => decodeActionReceipt({ ...receipt(), relationshipSessionId: uuid(999) }, command, scope.relationshipSessionId)).toThrow('session');
    expect(() => decodeActionReceipt({ ...receipt(), relationshipSessionId: null }, command)).toThrow();
  });
});

describe('read-only receipt transport', () => {
  const make = (data: unknown = legacyReceipt()) => {
    const readSession = vi.fn().mockResolvedValue({ accountId: scope.accountId, accessToken: 'synthetic-owner' });
    const callRpc = vi.fn().mockResolvedValue({ data, error: null });
    return { readSession, callRpc, transport: createActionTransport({ backendId: scope.backendId, readSession, callRpc }) };
  };
  it('uses only get_my_action_receipt with the captured owner token and no session rebinding', async () => {
    const f = make(); const signal = new AbortController().signal;
    expect(await f.transport.readReceipt!(command, legacyScope(), signal)).toEqual({ kind: 'confirmed', receipt: legacyReceipt() });
    expect(f.callRpc).toHaveBeenCalledExactlyOnceWith({ name: 'get_my_action_receipt', parameters: { p_command_id: command.commandId, p_expected_relationship_id: command.expectedRelationshipId } }, 'synthetic-owner', signal);
  });
  it('does not read another account’s command, and drops a response if the account changes after its checked-token request', async () => {
    const f = make(); f.readSession.mockResolvedValue({ accountId: uuid(90), accessToken: 'different-account' });
    expect((await f.transport.readReceipt!(command, legacyScope(), new AbortController().signal)).kind).toBe('unavailable'); expect(f.callRpc).not.toHaveBeenCalled();
    f.readSession.mockResolvedValueOnce({ accountId: scope.accountId, accessToken: 'synthetic-owner' }).mockResolvedValue({ accountId: uuid(90), accessToken: 'different-account' });
    expect((await f.transport.readReceipt!(command, legacyScope(), new AbortController().signal)).kind).toBe('unavailable');
  });
  it('distinguishes a missing owned receipt from a request error and preserves old data without generation', async () => {
    const f = make(null); expect(await f.transport.readReceipt!(command, legacyScope(), new AbortController().signal)).toEqual({ kind: 'not_found' });
    f.callRpc.mockResolvedValue({ data: null, error: { message: 'Forbidden', code: '42501' } });
    expect((await f.transport.readReceipt!(command, legacyScope(), new AbortController().signal)).kind).toBe('unavailable');
  });
  it('does not let a Continued same-period identity authorize an old-session command', async () => {
    const execute = vi.fn(); const transport = withCurrentVerification({ backendId: scope.backendId, execute }, {
      identity: async () => ({ ...emptyIdentity('linked', scope.accountId), canAccessData: true, relationshipId: scope.relationshipId,
        participantId: scope.participantId, relationshipStatus: 'active', relationshipSessionId: uuid(2000) }),
      accounting: async () => true, isCurrent: () => true,
    });
    expect((await transport.execute(command, scope, new AbortController().signal)).kind).toBe('not_sent'); expect(execute).not.toHaveBeenCalled();
  });
});
