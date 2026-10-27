import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRecoverySnapshot, forgetRecovery, isTransportUnavailable, projectRecoverySnapshot, readRecoverySnapshot, reconcileRecoveryAccount, recoveryAccess, recoveryCommands, saveRecoverySnapshot, setRecoveryAccess, verifyRecoveryScope } from '@/lib/offline/recovery';
import { withCurrentVerification } from '@/lib/offline/verified-transport';
import { emptyIdentity } from '@/lib/identity';
import type { RewardActionData } from '@/data/rewards/actionReadModel';
import { command, deferred, receipt, scope, uuid } from './action-queue.helpers';
import type { QueueEntry } from '@/data/actions/contracts';

const data = () => ({
  wallets: [{ participant_id: scope.participantId, relationship_id: scope.relationshipId, currency: 'sub', balance: 105 },
    { participant_id: uuid(7), relationship_id: scope.relationshipId, currency: 'dom', balance: 999 }],
  lots: [{ owner_participant_id: scope.participantId, relationship_id: scope.relationshipId, currency: 'sub', status: 'available', reward_id: uuid(8) }],
  rewards: [{ title: 'PRIVATE REWARD', background_image_url: 'https://private.invalid/photo' }],
  events: [{ subject: { title: 'PRIVATE PARTNER NAME' } }], deliveries: [{ secret: 'SECRET' }],
} as unknown as RewardActionData);
beforeEach(() => { localStorage.clear(); clearRecoverySnapshot(scope.backendId); setRecoveryAccess(scope.backendId, scope.accountId, 'checking'); });
describe('minimal confirmed recovery projection', () => {
  it('stores only this participant’s confirmed totals, without titles, avatars, partner ID or arbitrary fields', () => {
    verifyRecoveryScope(scope);
    const snapshot = projectRecoverySnapshot(scope, data(), 12345);
    expect(saveRecoverySnapshot(snapshot)).toBe(true);
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toEqual(snapshot);
    expect(snapshot.wallets).toEqual([{ currency: 'sub', balance: 105 }]);
    expect(snapshot.availableRewards).toEqual([{ currency: 'sub', quantity: 1 }, { currency: 'dom', quantity: 0 }]);
    const raw = JSON.stringify(snapshot);
    for (const secret of ['PRIVATE', 'SECRET', 'photo', uuid(7), uuid(8), 'permissions', 'access_token']) expect(raw).not.toContain(secret);
  });
  it('cannot persist an unverified scope or read across accounts/backends', () => {
    const snapshot = projectRecoverySnapshot(scope, data(), 12345);
    expect(saveRecoverySnapshot(snapshot)).toBe(false);
    verifyRecoveryScope(scope); expect(saveRecoverySnapshot(snapshot)).toBe(true);
    expect(readRecoverySnapshot(scope.backendId, uuid(9))).toBeNull();
    expect(readRecoverySnapshot('http://other.invalid', scope.accountId)).toBeNull();
  });
  it('clears on logout, account or period switch and rejects late writes from the old scope', () => {
    const snapshot = projectRecoverySnapshot(scope, data(), 12345);
    verifyRecoveryScope(scope); saveRecoverySnapshot(snapshot);
    verifyRecoveryScope({ ...scope, relationshipId: uuid(10) });
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
    expect(saveRecoverySnapshot(snapshot)).toBe(false);
    verifyRecoveryScope(scope); saveRecoverySnapshot(snapshot);
    reconcileRecoveryAccount(scope.backendId, uuid(11));
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
    expect(saveRecoverySnapshot(snapshot)).toBe(false);
    verifyRecoveryScope(scope); saveRecoverySnapshot(snapshot);
    reconcileRecoveryAccount(scope.backendId, null);
    expect(localStorage.length).toBe(0);
  });
  it('clears a Continued same-period snapshot and rejects pre-session summaries without inferring provenance', () => {
    verifyRecoveryScope(scope); const snapshot = projectRecoverySnapshot(scope, data(), 12345); saveRecoverySnapshot(snapshot);
    verifyRecoveryScope({ ...scope, relationshipSessionId: uuid(1001) });
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull(); expect(saveRecoverySnapshot(snapshot)).toBe(false);
    const { relationshipSessionId: _session, ...oldScope } = scope;
    localStorage.setItem(`obedience-recovery-v1:${encodeURIComponent(scope.backendId)}`, JSON.stringify({ ...snapshot, scope: oldScope }));
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
  });
  it('retains data on transport outage but deletes it on explicit denial or corrupt storage', () => {
    verifyRecoveryScope(scope); saveRecoverySnapshot(projectRecoverySnapshot(scope, data(), 12345));
    setRecoveryAccess(scope.backendId, scope.accountId, 'unreachable');
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)?.wallets[0].balance).toBe(105);
    setRecoveryAccess(scope.backendId, scope.accountId, 'denied');
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
    localStorage.setItem(`obedience-recovery-v1:${encodeURIComponent(scope.backendId)}`, '{broken');
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
  });
  it('does not claim storage succeeded after quota denial', () => {
    verifyRecoveryScope(scope);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError'); });
    expect(saveRecoverySnapshot(projectRecoverySnapshot(scope, data(), 12345))).toBe(false);
  });
  it('logout invalidates in-memory recovery and prevents delayed snapshot writes', () => {
    verifyRecoveryScope(scope); const snapshot = projectRecoverySnapshot(scope, data(), 12345); saveRecoverySnapshot(snapshot);
    setRecoveryAccess(scope.backendId, scope.accountId, 'unreachable');
    forgetRecovery(scope.backendId);
    expect(recoveryAccess(scope.backendId, scope.accountId)).toBe('checking');
    expect(saveRecoverySnapshot(snapshot)).toBe(false);
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
  });
  it.each(['AUTH_REQUIRED', '403 Forbidden', 'permission denied', 'Invalid identity', 'Failed to fetch: 401 unauthorized'])('never falls back for %s', error => {
    expect(isTransportUnavailable(new Error(error))).toBe(false);
  });
  it.each(['TypeError: Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource', 'fetch failed: ECONNREFUSED'])('recognizes transport failure even with navigator online: %s', error => {
    expect(isTransportUnavailable(new Error(error))).toBe(true);
  });
  it('projects the original store read-only, hiding targets/errors/receipts and other accounts', () => {
    const row = { sequence: 1, scope, command, state: { status: 'confirmation_unknown' }, createdAt: 10, problem: { message: 'PRIVATE' } } as unknown as QueueEntry;
    const rows = recoveryCommands([row, { ...row, scope: { ...scope, accountId: uuid(9) } }, { ...row, scope: { ...scope, backendId: 'http://other.invalid' } }], scope.backendId, scope.accountId);
    expect(rows).toEqual([{ id: command.commandId, kind: 'reward_buy', status: 'confirmation_unknown', createdAt: 10 }]);
    expect(JSON.stringify(rows)).not.toContain(command.rewardId);
  });
});

const ready = () => ({ ...emptyIdentity('linked', scope.accountId), canAccessData: true, relationshipStatus: 'active', relationshipId: scope.relationshipId, relationshipSessionId: scope.relationshipSessionId, participantId: scope.participantId });
function setup() {
  const send = vi.fn().mockResolvedValue({ kind: 'confirmed', receipt: receipt() });
  const checks = { identity: vi.fn().mockResolvedValue(ready()), accounting: vi.fn().mockResolvedValue(true), isCurrent: vi.fn().mockReturnValue(true) };
  return { send, checks, transport: withCurrentVerification({ backendId: scope.backendId, execute: send }, checks) };
}
describe('live verification before replay', () => {
  it('requires current identity and gate on every retry while retaining the exact command payload', async () => {
    const { send, checks, transport } = setup();
    const signal = new AbortController().signal;
    await transport.execute(command, scope, signal); await transport.execute(command, scope, signal);
    expect(checks.identity).toHaveBeenCalledTimes(2); expect(checks.accounting).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, command, scope, signal); expect(send).toHaveBeenNthCalledWith(2, command, scope, signal);
  });
  it('does not send after unreachable identity, disabled gate, changed participant or relationship', async () => {
    for (const failure of ['network', 'gate', 'participant', 'relationship']) {
      const { send, checks, transport } = setup();
      if (failure === 'network') checks.identity.mockRejectedValue(new TypeError('Failed to fetch'));
      if (failure === 'gate') checks.accounting.mockResolvedValue(false);
      if (failure === 'participant') checks.identity.mockResolvedValue({ ...ready(), participantId: uuid(20) });
      if (failure === 'relationship') checks.identity.mockResolvedValue({ ...ready(), relationshipId: uuid(21) });
      expect((await transport.execute(command, scope, new AbortController().signal)).kind).toBe('not_sent');
      expect(send).not.toHaveBeenCalled();
    }
  });
  it('discards verification finishing after an account switch or abort', async () => {
    const { send, checks, transport } = setup(); const gate = deferred<boolean>(); checks.accounting.mockReturnValue(gate.promise);
    const controller = new AbortController(); const result = transport.execute(command, scope, controller.signal);
    await Promise.resolve(); checks.isCurrent.mockReturnValue(false); controller.abort(); gate.resolve(true);
    expect((await result).kind).toBe('not_sent'); expect(send).not.toHaveBeenCalled();
  });
  it('preserves an uncertain command result instead of relabeling it not sent', async () => {
    const { send, transport } = setup(); const uncertain = { kind: 'confirmation_unknown', problem: { code: 'LOST_RESPONSE', retryable: true, message: 'Unknown' } };
    send.mockResolvedValue(uncertain);
    expect(await transport.execute(command, scope, new AbortController().signal)).toBe(uncertain);
  });
});
