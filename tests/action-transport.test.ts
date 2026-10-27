import { describe, expect, it, vi } from 'vitest';
import { decodeActionReceipt } from '@/data/actions/contracts';
import { createRewardTransport, actionCommandRequest, rewardCommandParameters, type RewardRpcResponse } from '@/data/actions/transport';
import { command, deferred, receipt, scope, uuid } from './action-queue.helpers';

function fixture(response: RewardRpcResponse = { data: receipt(), error: null, status: 200 }) {
  const readSession = vi.fn(async () => ({ accountId: scope.accountId, accessToken: 'synthetic-token-A' }));
  const callRpc = vi.fn(async () => response);
  return { readSession, callRpc, transport: createRewardTransport({ backendId: scope.backendId, readSession, callRpc }) };
}
const signal = () => new AbortController().signal;

describe('reward RPC transport', () => {
  it('sends only the immutable command contract, including explicit inventory currency', () => {
    expect(rewardCommandParameters({ commandId: command.commandId, expectedRelationshipId: scope.relationshipId, rewardId: uuid(5), kind: 'reward_redeem', inventoryCurrency: 'dom' }, scope)).toEqual({
      p_command_id: command.commandId, p_expected_relationship_id: scope.relationshipId, p_action: 'reward_redeem',
      p_reward_id: uuid(5), p_event_id: null, p_inventory_currency: 'dom', p_expected_cost: null, p_expected_relationship_session_id: scope.relationshipSessionId,
    });
    expect(rewardCommandParameters({ commandId: uuid(4), expectedRelationshipId: uuid(3), kind: 'undo', eventId: uuid(6) }, scope)).toMatchObject({ p_reward_id: null, p_event_id: uuid(6), p_inventory_currency: null });
  });
  it('pins the checked account token and validates the returned receipt', async () => {
    const f = fixture();
    const result = await f.transport.execute(command, scope, signal());
    expect(result).toEqual({ kind: 'confirmed', receipt: receipt() });
    expect(f.callRpc).toHaveBeenCalledWith(actionCommandRequest(command, scope), 'synthetic-token-A', expect.any(AbortSignal));
    expect(rewardCommandParameters(command, scope).p_expected_cost).toBe(20);
  });
  it.each([undefined, null, -1, 1.5, 2147483648])('does not send a Buy with invalid reviewed cost %s', async expectedCost => {
    const f = fixture();
    const input = { ...command, expectedCost };
    expect(await f.transport.execute(input, scope, signal())).toMatchObject({ kind: 'not_sent', problem: { code: 'INVALID_SAVED_COMMAND' } });
    expect(f.callRpc).not.toHaveBeenCalled();
  });
  it('preserves exact reviewed/current costs in a clear price-change rejection', async () => {
    const f = fixture({ data: null, status: 400, error: { code: '22023', message: 'REWARD_COST_CHANGED', details: '{"expectedCost":20,"currentCost":30}' } });
    expect(await f.transport.execute(command, scope, signal())).toMatchObject({ kind: 'rejected', problem: { code: 'REWARD_COST_CHANGED', expectedCost: 20, currentCost: 30, retryable: false, message: expect.stringContaining('30 points instead of 20') } });
    f.callRpc.mockResolvedValue({ data: null, status: 400, error: { code: '22023', message: 'REWARD_COST_CHANGED', details: '{"expectedCost":20,"currentCost":"untrusted text"}' } });
    const invalidDetail = await f.transport.execute(command, scope, signal());
    expect(invalidDetail).toMatchObject({ kind: 'rejected', problem: { expectedCost: undefined, currentCost: undefined } });
    expect(JSON.stringify(invalidDetail)).not.toContain('untrusted text');
  });
  it.each(['account', 'backend', 'period', 'missing-session', 'empty-token', 'aborted'] as const)('does not send with %s mismatch', async kind => {
    const f = fixture(); const abort = new AbortController();
    const current = { ...scope };
    if (kind === 'account') f.readSession.mockResolvedValue({ accountId: uuid(99), accessToken: 'B' });
    if (kind === 'backend') current.backendId = 'https://other.invalid';
    if (kind === 'period') current.relationshipId = uuid(99);
    if (kind === 'missing-session') f.readSession.mockResolvedValue(null);
    if (kind === 'empty-token') f.readSession.mockResolvedValue({ accountId: scope.accountId, accessToken: '' });
    if (kind === 'aborted') abort.abort();
    expect((await f.transport.execute(command, current, abort.signal)).kind).toBe('not_sent');
    expect(f.callRpc).not.toHaveBeenCalled();
  });
  it('checks cancellation again after an asynchronous session read', async () => {
    const session = deferred<{ accountId: string; accessToken: string }>();
    const f = fixture(); f.readSession.mockReturnValue(session.promise);
    const abort = new AbortController(); const work = f.transport.execute(command, scope, abort.signal);
    abort.abort(); session.resolve({ accountId: scope.accountId, accessToken: 'A' });
    expect((await work).kind).toBe('not_sent'); expect(f.callRpc).not.toHaveBeenCalled();
  });
  it('preserves a structured undo dependency without rendering arbitrary server details', async () => {
    const f = fixture({ data: null, status: 400, error: { code: '22023', message: 'UNDO_USE_FIRST', details: JSON.stringify({ dependencyEventId: uuid(6), unrelated: 'private diagnostic' }) } });
    const result = await f.transport.execute(command, scope, signal());
    expect(result).toMatchObject({ kind: 'rejected', problem: { code: 'UNDO_USE_FIRST', dependencyEventId: uuid(6), retryable: false } });
    expect(JSON.stringify(result)).not.toContain('private diagnostic');
  });
  it('keeps timezone rejection actionable and suppresses malformed dependency identifiers', async () => {
    const f = fixture({ data: null, status: 400, error: { code: '22023', message: 'TIMEZONE_REQUIRED' } });
    expect(await f.transport.execute(command, scope, signal())).toMatchObject({ kind: 'rejected', problem: { code: 'TIMEZONE_REQUIRED', message: expect.stringContaining('timezone') } });
    f.callRpc.mockResolvedValue({ data: null, status: 400, error: { code: '22023', message: 'UNDO_USE_FIRST', details: '{"dependencyEventId":"not-an-event"}' } });
    expect(await f.transport.execute(command, scope, signal())).toMatchObject({ kind: 'rejected', problem: { dependencyEventId: undefined } });
  });
  it.each(['network', 'gateway', 'unrecognized-sql'] as const)('keeps %s failures uncertain', async kind => {
    const f = fixture();
    if (kind === 'network') f.callRpc.mockRejectedValue(new Error('response lost'));
    if (kind === 'gateway') f.callRpc.mockResolvedValue({ data: null, status: 503, error: { code: '22023', message: 'TIMEZONE_REQUIRED' } });
    if (kind === 'unrecognized-sql') f.callRpc.mockResolvedValue({ data: null, status: 500, error: { code: '08006', message: 'connection failure' } });
    expect(await f.transport.execute(command, scope, signal())).toMatchObject({ kind: 'confirmation_unknown', problem: { retryable: true } });
  });
  it.each(['command', 'period', 'negative-quantity', 'fraction', 'duplicate-wallet', 'refund-total', 'feedback-event', 'zero-refund'] as const)('rejects a malformed %s receipt without success', async kind => {
    const data = receipt();
    if (kind === 'command') data.commandId = uuid(99);
    if (kind === 'period') data.relationshipId = uuid(99);
    if (kind === 'negative-quantity') data.availableRewardQuantities = [{ rewardId: uuid(5), ownerParticipantId: uuid(2), currency: 'sub', quantity: -1 }];
    if (kind === 'fraction') data.balances = [{ participantId: uuid(2), currency: 'sub', balance: 1.2 }];
    if (kind === 'duplicate-wallet') data.balances = [...data.balances, ...data.balances];
    if (kind === 'refund-total') data.refunds = [{ participantId: uuid(2), currency: 'sub', paidPoints: 2, migrationCredit: 0, total: 3 }];
    if (kind === 'feedback-event') data.feedback = [{ eventId: uuid(99), recipientParticipantId: uuid(2), subjectTitle: 'Synthetic', kind: 'action_confirmed' }];
    if (kind === 'zero-refund') data.feedback = [{ eventId: uuid(6), recipientParticipantId: uuid(2), subjectTitle: 'Synthetic', kind: 'points_refunded', reason: 'reward_deleted', currency: 'sub', points: 0, balanceAfter: 17 }];
    const f = fixture({ data, error: null, status: 200 });
    expect(await f.transport.execute(command, scope, signal())).toMatchObject({ kind: 'confirmation_unknown', problem: { code: 'INVALID_RECEIPT', retryable: false } });
  });
  it('accepts a genuine positive refund and its historical command-time balance', () => {
    const data = receipt(); data.feedback = [{ eventId: uuid(6), recipientParticipantId: uuid(2), subjectTitle: 'Synthetic', kind: 'points_refunded', reason: 'reward_deleted', currency: 'sub', points: 5, balanceAfter: 17 }];
    data.refunds = [{ participantId: uuid(2), currency: 'sub', paidPoints: 5, migrationCredit: 0, total: 5 }];
    expect(decodeActionReceipt(data, command)).toEqual(data);
  });
});
