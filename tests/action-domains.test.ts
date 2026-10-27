import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionReceipt, RecordingProgress, TaskProgress } from '@/domain/actions/types';
import { decodeActionCommand, decodeActionReceipt, type ActionIntent, type CommandOutcome, type QueuedActionCommand } from '@/data/actions/contracts';
import { actionCommandRequest, createActionTransport, unknownProblem, type ActionRpcResponse } from '@/data/actions/transport';
import { ActionCommandQueue, RewardCommandQueue } from '@/data/actions/queue';
import { MemoryQueueStore, TestConnection, command, receipt, scope, uuid, taskContext, ruleContext, punishmentContext } from './action-queue.helpers';

const taskCommand: QueuedActionCommand = { kind: 'task_complete', commandId: uuid(70), expectedRelationshipId: scope.relationshipId, taskId: uuid(71), expectedContext: taskContext() };
const ruleCommand: QueuedActionCommand = { kind: 'rule_violation', commandId: uuid(72), expectedRelationshipId: scope.relationshipId, ruleId: uuid(73), expectedContext: ruleContext() };
const punishmentCommand: QueuedActionCommand = { kind: 'punishment_apply', commandId: uuid(74), expectedRelationshipId: scope.relationshipId, punishmentId: uuid(75), expectedContext: punishmentContext() };
const undoCommand: QueuedActionCommand = { kind: 'undo', commandId: uuid(76), expectedRelationshipId: scope.relationshipId, eventId: uuid(77) };
const taskProgress = (taskId = uuid(71)): TaskProgress => ({ taskId, beneficiaryParticipantId: scope.participantId, currency: 'sub',
  timeZone: 'America/Boise', localDate: '2026-10-26', weekStartDate: '2026-10-26', weekIdentifier: '2026-W44', frequency: 'daily', target: 2,
  currentCount: 1, usageData: [1,0,0,0,0,0,0], completed: false, lastCompletedDate: '2026-10-26', deleted: false });
const recordingProgress = (subjectType: 'rule' | 'punishment', subjectId: string): RecordingProgress => ({ subjectType, subjectId,
  beneficiaryParticipantId: scope.participantId, timeZone: 'America/Boise', localDate: '2026-10-26', weekStartDate: '2026-10-26',
  weekIdentifier: '2026-W44', usageData: [1,0,0,0,0,0,0], currentCount: 1, deleted: false });
const actionReceipt = (input: QueuedActionCommand): ActionReceipt => {
  const base = receipt(input);
  if (input.kind === 'task_complete') return { ...base, taskProgress: taskProgress(input.taskId), pointDeltas: [{ participantId: scope.participantId, currency: 'sub', amount: 5 }] };
  if (input.kind === 'rule_violation') return { ...base, recordingProgress: recordingProgress('rule', input.ruleId), pointDeltas: [] };
  if (input.kind === 'punishment_apply') return { ...base, recordingProgress: recordingProgress('punishment', input.punishmentId),
    balances: [...base.balances, { participantId: uuid(78), currency: 'dom', balance: 80 }],
    pointDeltas: [{ participantId: scope.participantId, currency: 'sub', amount: -5 }, { participantId: uuid(78), currency: 'dom', amount: 3 }] };
  return base;
};
const cases = [taskCommand, ruleCommand, punishmentCommand, undoCommand];

describe('shared action routing and receipt boundary', () => {
  it.each(cases)('routes $kind through its reviewed RPC with only canonical target fields', async input => {
    const callRpc = vi.fn(async (): Promise<ActionRpcResponse> => ({ data: actionReceipt(input), error: null }));
    const adapter = createActionTransport({ backendId: scope.backendId, readSession: async () => ({ accountId: scope.accountId, accessToken: 'synthetic-token' }), callRpc });
    expect((await adapter.execute(input, scope, new AbortController().signal)).kind).toBe('confirmed');
    const common = { p_command_id: input.commandId, p_expected_relationship_id: input.expectedRelationshipId, p_expected_relationship_session_id: scope.relationshipSessionId };
    const expected = input.kind === 'task_complete' ? { name: 'execute_task_command', parameters: { ...common, p_action: 'task_complete', p_task_id: input.taskId, p_event_id: null, p_expected_context: input.expectedContext } }
      : input.kind === 'rule_violation' ? { name: 'execute_recording_command', parameters: { ...common, p_action: 'rule_violation', p_rule_id: input.ruleId, p_punishment_id: null, p_event_id: null, p_expected_context: input.expectedContext } }
      : input.kind === 'punishment_apply' ? { name: 'execute_recording_command', parameters: { ...common, p_action: 'punishment_apply', p_rule_id: null, p_punishment_id: input.punishmentId, p_event_id: null, p_expected_context: input.expectedContext } }
      : { name: 'undo_action', parameters: { ...common, p_event_id: uuid(77) } };
    expect(callRpc).toHaveBeenCalledWith(expected, 'synthetic-token', expect.any(AbortSignal));
  });
  it('retains the Buy expected-cost precondition and rejects extra authority/calendar inputs for all new actions', () => {
    expect(actionCommandRequest(command, scope)).toMatchObject({ name: 'execute_reward_command', parameters: { p_expected_cost: 20 } });
    for (const input of cases) for (const extra of [{ amount: 999 }, { participantId: uuid(99) }, { timeZone: 'UTC' }, { relationshipId: uuid(99) }]) {
      expect(() => decodeActionCommand({ ...input, ...extra })).toThrow();
    }
    expect(() => decodeActionCommand({ ...taskCommand, taskId: undefined, rewardId: uuid(9) })).toThrow();
    expect(() => decodeActionCommand({ ...ruleCommand, ruleId: undefined, punishmentId: uuid(9) })).toThrow();
    expect(() => decodeActionCommand({ ...punishmentCommand, punishmentId: undefined, ruleId: uuid(9) })).toThrow();
  });
  it.each([taskCommand, ruleCommand, punishmentCommand])('retains $kind progress and point effects without fabricating a refund', input => {
    const parsed = decodeActionReceipt(actionReceipt(input), input);
    expect(parsed).toEqual(actionReceipt(input)); expect(parsed.refunds).toEqual([]);
  });
  it('preserves zero-point effects, negative balances, and null current progress on a legitimate Undo', () => {
    const data = { ...receipt(undoCommand), pointDeltas: [{ participantId: scope.participantId, currency: 'sub' as const, amount: -5 }],
      balances: [{ participantId: scope.participantId, currency: 'sub' as const, balance: -2 }], taskProgress: null };
    expect(decodeActionReceipt(data, undoCommand)).toEqual(data);
    const zero = { ...actionReceipt(taskCommand), pointDeltas: [{ participantId: scope.participantId, currency: 'sub' as const, amount: 0 }] };
    expect(decodeActionReceipt(zero, taskCommand).pointDeltas[0].amount).toBe(0);
    expect(decodeActionReceipt({ ...data, taskProgress: undefined, recordingProgress: null }, undoCommand).recordingProgress).toBeNull();
  });
  it('validates daily versus weekly counts and ISO week-year boundaries without using the browser timezone', () => {
    const valid = { ...actionReceipt(taskCommand), taskProgress: { ...taskProgress(), localDate: '2027-01-01', weekStartDate: '2026-12-28', weekIdentifier: '2026-W53',
      lastCompletedDate: '2027-01-01', usageData: [0,0,0,0,1,0,0] } };
    expect(decodeActionReceipt(valid, taskCommand).taskProgress.weekIdentifier).toBe('2026-W53');
    const weekly = { ...valid, taskProgress: { ...valid.taskProgress, frequency: 'weekly' as const, usageData: [1,0,0,0,1,0,0], currentCount: 2, completed: true } };
    expect(decodeActionReceipt(weekly, taskCommand).taskProgress.currentCount).toBe(2);
  });
  it.each([
    { taskId: uuid(99) }, { target: 0 }, { currentCount: 1.5 }, { usageData: [1,0,0,0,0,0] }, { usageData: [-1,0,0,0,0,0,0] },
    { completed: true }, { localDate: '2026-02-30' }, { weekStartDate: '2026-10-25' }, { weekIdentifier: '2026-W43' },
    { lastCompletedDate: 'tomorrow' }, { currency: 'cash' }, { currentCount: '1' }, { timeZone: '' },
  ])('rejects malformed task progress %j as an unconfirmed response', patch => {
    expect(() => decodeActionReceipt({ ...actionReceipt(taskCommand), taskProgress: { ...taskProgress(), ...patch } }, taskCommand)).toThrow();
  });
  it.each([
    { subjectType: 'punishment' }, { subjectId: uuid(99) }, { currentCount: 2 }, { usageData: [0,0,0,0,0,0] }, { deleted: 'false' },
  ])('rejects malformed recording progress %j', patch => {
    expect(() => decodeActionReceipt({ ...actionReceipt(ruleCommand), recordingProgress: { ...recordingProgress('rule', uuid(73)), ...patch } }, ruleCommand)).toThrow();
  });
  it('rejects missing completion projections, mismatched delta wallets, fractional effects and mixed-domain progress', () => {
    for (const input of [taskCommand, ruleCommand, punishmentCommand]) expect(() => decodeActionReceipt(receipt(input), input)).toThrow();
    const task = actionReceipt(taskCommand);
    for (const pointDeltas of [[{ participantId: uuid(99), currency: 'sub', amount: 5 }], [{ participantId: scope.participantId, currency: 'sub', amount: 0.5 }], [...task.pointDeltas,...task.pointDeltas]]) {
      expect(() => decodeActionReceipt({ ...task, pointDeltas }, taskCommand)).toThrow();
    }
    expect(() => decodeActionReceipt({ ...task, recordingProgress: recordingProgress('rule', uuid(73)) }, taskCommand)).toThrow();
    expect(() => decodeActionReceipt({ ...receipt(command), taskProgress: taskProgress() }, command)).toThrow();
  });
  it.each(['TASK_TARGET_REACHED','TASK_OWNER_MISSING','TIMEZONE_REQUIRED','SUB_PARTICIPANT_REQUIRED','RECORDING_NOT_INITIALIZED','ACTION_NOT_ALLOWED','ORIGINAL_BENEFICIARY_REQUIRED'])('maps %s to a specific reviewable rejection', async code => {
    const transport = createActionTransport({ backendId: scope.backendId, readSession: async () => ({ accountId: scope.accountId, accessToken: 'fixture' }),
      callRpc: async () => ({ data: null, error: { code: '22023', message: code }, status: 400 }) });
    const result = await transport.execute(taskCommand, scope, new AbortController().signal);
    expect(result).toMatchObject({ kind: 'rejected', problem: { code, retryable: false } });
    if (result.kind !== 'confirmed') expect(result.problem.message).not.toContain('The server rejected');
  });
});

const active: ActionCommandQueue[] = [];
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00Z')); });
afterEach(() => { for (const queue of active.splice(0)) queue.dispose(); vi.useRealTimers(); });
describe('one durable queue for every action family', () => {
  it('keeps the existing Reward constructor as the exact same class', () => { expect(RewardCommandQueue).toBe(ActionCommandQueue); });
  it.each([taskCommand, ruleCommand, punishmentCommand])('recovers $kind after response loss with the original target/account/period and ID', async original => {
    const store = new MemoryQueueStore(); const connection = new TestConnection(); const sent: QueuedActionCommand[] = [];
    const transport = { backendId: scope.backendId, execute: vi.fn(async (input: QueuedActionCommand): Promise<CommandOutcome> => { sent.push(structuredClone(input)); return { kind: 'confirmation_unknown', problem: unknownProblem() }; }) };
    const queue = new ActionCommandQueue({ store, connection, transport }); active.push(queue);queue.setContext(scope);
    const { commandId: _id, expectedRelationshipId: _period, ...intent } = original;
    const saved = await queue.enqueue(intent as ActionIntent); connection.online=true;await queue.flush();expect((await store.list())[0].state.status).toBe('confirmation_unknown');queue.dispose();
    const confirmed=vi.fn();
    transport.execute.mockImplementation(async input => { sent.push(structuredClone(input));return { kind: 'confirmed', receipt: actionReceipt(input) }; });
    const reloaded = new ActionCommandQueue({ store, connection, transport, onConfirmed: confirmed });active.push(reloaded);
    reloaded.setContext({ ...scope, relationshipId: uuid(91) });await reloaded.flush();expect(sent).toHaveLength(1);expect((await reloaded.list())[0].canReplay).toBe(false);
    reloaded.setContext({ ...scope, accountId: uuid(92), participantId: uuid(93) });await reloaded.flush();expect(await reloaded.list()).toEqual([]);
    reloaded.setContext(scope);await reloaded.retry(saved.command.commandId);await reloaded.flush();
    expect(sent).toEqual([saved.command,saved.command]);expect(confirmed).toHaveBeenCalledTimes(1);
    const persisted=(await store.list())[0];expect(persisted.scope).toEqual(scope);expect(persisted.state.status).toBe('confirmed');
    if(persisted.state.status==='confirmed') expect(persisted.state.receipt).toEqual(actionReceipt(saved.command));
  });
});
