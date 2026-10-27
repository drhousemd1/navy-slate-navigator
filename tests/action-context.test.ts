import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionCommandQueue } from '@/data/actions/queue';
import { blocksNewAction, decodeActionCommand, decodeExpectedContext, decodeQueueEntry, decodeStoredActionCommand, type CommandOutcome, type QueueEntry } from '@/data/actions/contracts';
import { createActionTransport } from '@/data/actions/transport';
import { IndexedDBActionQueueStore } from '@/data/actions/store';
import { MemoryQueueStore, TestConnection, deferred, receipt, scope, taskContext, ruleContext, punishmentContext, uuid } from './action-queue.helpers';

const oldCommand = () => ({ commandId: uuid(701), expectedRelationshipId: scope.relationshipId, kind: 'task_complete' as const, taskId: uuid(71) });
const newCommand = () => ({ ...oldCommand(), expectedContext: taskContext() });
const oldRow = (): QueueEntry => ({ version: 1, sequence: 1, scope, command: oldCommand(), createdAt: 1, updatedAt: 1,
  state: { status: 'pending', command: oldCommand() }, attempts: 0, everSent: false, nextAttemptAt: 1, problem: null, lease: null });
const taskReceipt = () => ({ ...receipt(oldCommand()), pointDeltas: [{ participantId: scope.participantId, currency: 'sub' as const, amount: 5 }],
  taskProgress: { taskId: uuid(71), beneficiaryParticipantId: scope.participantId, currency: 'sub' as const, timeZone: 'America/Boise', localDate: '2026-10-26', weekStartDate: '2026-10-26',
    weekIdentifier: '2026-W44', frequency: 'daily' as const, target: 2, currentCount: 1, usageData: [1,0,0,0,0,0,0], completed: false, lastCompletedDate: '2026-10-26', deleted: false } });
const active: ActionCommandQueue[] = [];
afterEach(() => { active.splice(0).forEach(queue => queue.dispose()); });
const setup = (store = new MemoryQueueStore()) => {
  const connection = new TestConnection();
  const execute = vi.fn(async (): Promise<CommandOutcome> => ({ kind: 'confirmed', receipt: taskReceipt() }));
  const readReceipt = vi.fn().mockResolvedValue({ kind: 'not_found' });
  const onConfirmed = vi.fn();
  const queue = new ActionCommandQueue({ store, connection, transport: { backendId: scope.backendId, execute, readReceipt }, onConfirmed });
  active.push(queue); queue.setContext(scope);
  return { queue, store, connection, execute, readReceipt, onConfirmed };
};

describe('immutable reviewed context and historical compatibility', () => {
  it('requires review facts on new commands and IDB inserts but preserves old pending/confirmed bytes on read', async () => {
    expect(() => decodeActionCommand(oldCommand())).toThrow(/Refresh and review/);
    expect(decodeStoredActionCommand(oldCommand())).toEqual(oldCommand());
    const factory = { open: vi.fn() };
    const store = new IndexedDBActionQueueStore('unused', factory as unknown as IDBFactory);
    await expect(store.insert(oldRow())).rejects.toThrow(/Refresh and review/); expect(factory.open).not.toHaveBeenCalled();
    for (const row of [oldRow(), { ...oldRow(), everSent: true, attempts: 1, state: { status: 'confirmed', receipt: taskReceipt() } }]) {
      expect(JSON.stringify(decodeQueueEntry(row))).toBe(JSON.stringify(row));
    }
  });
  it.each([taskContext(), ruleContext(), punishmentContext()])('accepts only the $kind contract without client authority fields', context => {
    expect(decodeExpectedContext(context)).toEqual(context);
    expect(() => decodeExpectedContext({ ...context, occurredAt: 'yesterday' })).toThrow();
    expect(() => decodeExpectedContext({ ...context, userId: uuid(90) })).toThrow();
  });
  it.each([
    { ...taskContext(), points: -1 }, { ...taskContext(), target: 0 }, { ...taskContext(), timeZone: 'Invented/Zone' },
    { ...taskContext(), localDate: '2026-02-30' }, { ...taskContext(), weekStartDate: '2026-10-25' },
    { ...taskContext(), localDate: '2026-11-02' }, { ...punishmentContext(), domAward: 0 },
    { ...punishmentContext(), dom: punishmentContext().sub },
  ])('rejects malformed or inconsistent context %j', context => { expect(() => decodeExpectedContext(context)).toThrow(); });
  it('supports each affected person’s distinct date/week and a missing Dom without inventing an award recipient', () => {
    expect(decodeExpectedContext({ ...punishmentContext(), dom: { ...punishmentContext().dom, localDate: '2026-10-25', weekStartDate: '2026-10-19' } })).toBeTruthy();
    expect(decodeExpectedContext({ ...punishmentContext(), dom: null })).toBeTruthy();
    expect(() => decodeActionCommand({ ...newCommand(), expectedContext: { ...taskContext(), subjectId: uuid(99) } })).toThrow(/different action/);
  });
  it('never sends or relabels a same-session old action after reload; only the owner can check its receipt', async () => {
    const store = new MemoryQueueStore(); const original = oldRow(); store.records.set(original.command.commandId, original);
    const before = JSON.stringify(original);
    const first = setup(store); first.connection.online = true; await first.queue.flush(); first.queue.dispose();
    const second = setup(store); second.connection.online = true; await second.queue.flush();
    expect(first.execute).not.toHaveBeenCalled(); expect(second.execute).not.toHaveBeenCalled();
    expect((await second.queue.list())[0]).toMatchObject({ canReplay: false, canCancel: false, canReconcile: true });
    await expect(second.queue.retry(original.command.commandId)).rejects.toThrow();
    expect(await second.queue.reconcile(original.command.commandId)).toBe('not_found');
    expect(JSON.stringify((await store.list())[0])).toBe(before);
    second.queue.setContext({ ...scope, accountId: uuid(99) });
    await expect(second.queue.reconcile(original.command.commandId)).rejects.toThrow(/unavailable/);
    expect(second.readReceipt).toHaveBeenCalledTimes(1);
  });
  it('recovers a committed old command without rewriting its assumptions or repeating feedback', async () => {
    const state = setup(); const original = oldRow(); state.store.records.set(original.command.commandId, original);
    state.readReceipt.mockResolvedValue({ kind: 'confirmed', receipt: taskReceipt() });
    expect(await state.queue.reconcile(original.command.commandId)).toBe('confirmed');
    const saved = (await state.store.list())[0];
    expect(saved.command).toEqual(original.command); expect(saved.attempts).toBe(0); expect(saved.everSent).toBe(false);
    expect(saved.state.status).toBe('confirmed'); expect(state.execute).not.toHaveBeenCalled(); expect(state.onConfirmed).not.toHaveBeenCalled();
  });
  it('preserves uncertainty and blocks replacements after review rejection; never retries changed assumptions', async () => {
    const state = setup(); const reviewed = newCommand();
    const saved = await state.queue.enqueue({ kind: reviewed.kind, taskId: reviewed.taskId, expectedContext: reviewed.expectedContext });
    state.execute.mockResolvedValueOnce({ kind: 'confirmation_unknown', problem: { code: 'CONNECTION_LOST', message: 'Unknown', retryable: false } });
    state.connection.online = true; await state.queue.flush();
    state.execute.mockResolvedValueOnce({ kind: 'rejected', problem: { code: 'ACTION_DATE_CHANGED', message: 'Day changed', retryable: false } });
    await state.queue.retry(saved.command.commandId);
    const [entry] = await state.queue.list();
    expect(entry).toMatchObject({ state: { status: 'confirmation_unknown' }, canReplay: false, canReconcile: true });
    expect(blocksNewAction(entry, scope)).toBe(true); expect(blocksNewAction(entry, { ...scope, relationshipSessionId: uuid(99) })).toBe(false);
    await expect(state.queue.retry(saved.command.commandId)).rejects.toThrow();
    expect(await state.queue.reconcile(saved.command.commandId)).toBe('not_found'); expect(blocksNewAction((await state.queue.list())[0], scope)).toBe(true);
    expect(state.execute.mock.calls[0]).toEqual(state.execute.mock.calls[1]);
  });
  it('leaves a definitively rejected action intact and permits an explicit newly reviewed command with a fresh ID', async () => {
    const state = setup(); const reviewed = newCommand();
    const first = await state.queue.enqueue({ kind: reviewed.kind, taskId: reviewed.taskId, expectedContext: reviewed.expectedContext });
    state.execute.mockResolvedValue({ kind: 'rejected', problem: { code: 'ACTION_DEFINITION_CHANGED', message: 'Points changed', retryable: false } });
    state.connection.online = true; await state.queue.flush(); state.connection.online = false;
    const rejected = (await state.queue.list())[0]; expect(rejected.canReplay).toBe(false); expect(blocksNewAction(rejected, scope)).toBe(false);
    const next = await state.queue.enqueue({ kind: reviewed.kind, taskId: reviewed.taskId, expectedContext: { ...reviewed.expectedContext, points: 8 } });
    expect(next.command.commandId).not.toBe(first.command.commandId); expect((await state.store.list())[0].command).toEqual(first.command);
  });
  it('suppresses late same-session recovery when the account changes', async () => {
    const state = setup(); const old = oldRow(); state.store.records.set(old.command.commandId, old);
    const reply = deferred<unknown>(); state.readReceipt.mockReturnValue(reply.promise);
    const checking = state.queue.reconcile(old.command.commandId); await vi.waitFor(() => expect(state.readReceipt).toHaveBeenCalledTimes(1));
    state.queue.setContext({ ...scope, accountId: uuid(90) }); reply.resolve({ kind: 'confirmed', receipt: taskReceipt() });
    await expect(checking).rejects.toThrow(/changed/); expect((await state.store.list())[0]).toEqual(old);
  });
  it.each(['ACTION_CONTEXT_REQUIRED','ACTION_CONTEXT_INVALID','ACTION_BENEFICIARY_CHANGED','ACTION_DEFINITION_CHANGED','ACTION_TIMEZONE_CHANGED','ACTION_DATE_CHANGED'])('maps %s to specific non-retryable review guidance', async code => {
    const transport = createActionTransport({ backendId: scope.backendId, readSession: async () => ({ accountId: scope.accountId, accessToken: 'synthetic' }),
      callRpc: async () => ({ data: null, error: { code: '22023', message: code }, status: 400 }) });
    const result = await transport.execute(newCommand(), scope, new AbortController().signal);
    expect(result).toMatchObject({ kind: 'rejected', problem: { code, retryable: false } });
    if (result.kind !== 'confirmed') expect(result.problem.message).not.toContain('The server rejected');
  });
});
