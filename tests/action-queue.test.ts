import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardCommandQueue } from '@/data/actions/queue';
import type { ActionQueueOptions } from '@/data/actions/queue';
import type { CommandOutcome, QueueEntry, RewardCommand } from '@/data/actions/contracts';
import { IndexedDBActionQueueStore } from '@/data/actions/store';
import { unknownProblem } from '@/data/actions/transport';
import { deferred, MemoryQueueStore, receipt, scope, TestConnection, uuid } from './action-queue.helpers';

const queues: RewardCommandQueue[] = [];
function fixture(overrides: Partial<ActionQueueOptions> = {}) {
  const store = overrides.store ?? new MemoryQueueStore();
  const connection = new TestConnection();
  const execute = vi.fn(async (command: RewardCommand): Promise<CommandOutcome> => ({ kind: 'confirmed', receipt: receipt(command) }));
  const confirmed = vi.fn(); const storageError = vi.fn(); let n = 100;
  const queue = new RewardCommandQueue({ store, connection, transport: { backendId: scope.backendId, execute },
    requestTimeoutMs: 100, leaseMs: 300, retryDelayMs: () => 50, uuid: () => uuid(++n), onConfirmed: confirmed, onStorageError: storageError, ...overrides });
  queues.push(queue); queue.setContext(scope);
  return { store, connection, execute, confirmed, storageError, queue };
}
async function save(f: ReturnType<typeof fixture>, kind: 'reward_buy' | 'reward_delete' = 'reward_buy') { return f.queue.enqueue(kind === 'reward_buy' ? { kind, rewardId: uuid(5), expectedCost: 20 } : { kind, rewardId: uuid(5) }); }
async function send(f: ReturnType<typeof fixture>) { f.connection.online = true; await f.queue.flush(); }
async function ticks() { for (let n = 0; n < 20; n++) await Promise.resolve(); }

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00Z')); });
afterEach(() => { for (const queue of queues.splice(0)) queue.dispose(); vi.useRealTimers(); });

describe('durable scoped reward queue', () => {
  it('persists an offline action before sending, and retains its confirmed receipt', async () => {
    const f = fixture(); const entry = await save(f);
    expect(entry.state.status).toBe('pending'); expect(f.execute).not.toHaveBeenCalled();
    await send(f);
    expect((await f.store.list())[0]).toMatchObject({ state: { status: 'confirmed', receipt: { commandId: entry.command.commandId } }, attempts: 1, lease: null });
    expect(f.confirmed).toHaveBeenCalledTimes(1);
    await f.queue.flush(); expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it('cannot send without identity and does not delete on sign-out', async () => {
    const f = fixture(); await save(f); f.queue.setContext(null); await send(f);
    expect(f.execute).not.toHaveBeenCalled(); expect(await f.queue.list()).toEqual([]); expect(await f.store.list()).toHaveLength(1);
    await expect(save(f)).rejects.toThrow(/signed-in/);
  });
  it('refuses to send if the durable write fails or IndexedDB is unavailable', async () => {
    const store = new MemoryQueueStore(); store.failInsert = true;
    const f = fixture({ store }); await expect(save(f)).rejects.toThrow('Disk unavailable'); await send(f);
    expect(f.execute).not.toHaveBeenCalled();
    const unavailable = fixture({ store: new IndexedDBActionQueueStore('unused', undefined) });
    await expect(save(unavailable)).rejects.toThrow(/IndexedDB/); expect(unavailable.execute).not.toHaveBeenCalled();
  });
  it('keeps an action in its captured scope when identity changes during saving', async () => {
    const disk = new MemoryQueueStore(); const saved = deferred<QueueEntry>();
    const f = fixture({ store: { ...disk, list: disk.list.bind(disk), update: disk.update.bind(disk), insert: async value => { const row = await disk.insert(value); await saved.promise; return row; } } });
    const work = save(f); await ticks(); f.queue.setContext({ ...scope, accountId: uuid(99), participantId: uuid(98), relationshipId: uuid(97) }); saved.resolve((await disk.list())[0]);
    await work; await send(f);
    expect(f.execute).not.toHaveBeenCalled(); expect((await disk.list())[0].scope).toEqual(scope); expect(await f.queue.list()).toEqual([]);
  });
  it('shows previous periods read-only for their account and never relabels/replays them', async () => {
    const f = fixture(); const entry = await save(f);
    f.queue.setContext({ ...scope, relationshipId: uuid(80) }); await send(f);
    expect(f.execute).not.toHaveBeenCalled(); expect((await f.queue.list())[0]).toMatchObject({ scope, canReplay: false, canCancel: false });
    await expect(f.queue.retry(entry.command.commandId)).rejects.toThrow(/account and period/);
    expect(await f.queue.cancelUnsent(entry.command.commandId)).toBe(false);
    f.queue.setContext({ ...scope, participantId: uuid(81) }); await f.queue.flush(); expect(f.execute).not.toHaveBeenCalled();
  });
  it('permits explicit cancellation only before any send', async () => {
    const f = fixture(); const first = await save(f);
    expect(await f.queue.cancelUnsent(first.command.commandId)).toBe(true); expect(await f.store.list()).toHaveLength(0);
    const second = await save(f); f.execute.mockResolvedValue({ kind: 'confirmation_unknown', problem: unknownProblem() }); await send(f);
    expect(await f.queue.cancelUnsent(second.command.commandId)).toBe(false); expect(await f.store.list()).toHaveLength(1);
  });
  it('reconciles a lost response with the same ID/payload after recreation, without a second success', async () => {
    const f = fixture(); const entry = await save(f);
    f.execute.mockResolvedValue({ kind: 'confirmation_unknown', problem: unknownProblem() }); await send(f);
    expect(f.confirmed).not.toHaveBeenCalled(); f.queue.dispose();
    const reloaded = fixture({ store: f.store }); await vi.advanceTimersByTimeAsync(50); await send(reloaded);
    expect(reloaded.execute.mock.calls[0][0]).toEqual(entry.command);
    expect((await reloaded.store.list())[0].command).toEqual(entry.command); expect(reloaded.confirmed).toHaveBeenCalledTimes(1);
    await reloaded.queue.flush(); expect(reloaded.execute).toHaveBeenCalledTimes(1);
  });
  it('bounds automatic attempts across reconnects, but allows an explicit same-ID retry', async () => {
    const f = fixture(); const entry = await save(f); f.execute.mockResolvedValue({ kind: 'confirmation_unknown', problem: unknownProblem() });
    await send(f); await vi.advanceTimersByTimeAsync(500);
    expect(f.execute).toHaveBeenCalledTimes(3);
    for (let n = 0; n < 3; n++) { f.connection.setOnline(false); f.connection.setOnline(true); await ticks(); }
    expect(f.execute).toHaveBeenCalledTimes(3); expect(f.confirmed).not.toHaveBeenCalled();
    f.execute.mockImplementation(async value => ({ kind: 'confirmed', receipt: receipt(value) })); await f.queue.retry(entry.command.commandId);
    expect(f.execute).toHaveBeenCalledTimes(4); expect(f.execute.mock.calls.every(args => JSON.stringify(args[0]) === JSON.stringify(entry.command))).toBe(true);
    expect(f.confirmed).toHaveBeenCalledTimes(1);
  });
  it('turns an expired sending lease into unknown even after the retry limit was reached', async () => {
    const f = fixture({ maxAutomaticAttempts: 1 }); const entry = await save(f);
    await f.store.update(entry.command.commandId, current => ({ ...current, state: { status: 'sending', command: current.command }, attempts: 1, everSent: true, lease: { token: 'crashed-tab', until: Date.now() - 1 } }));
    await send(f); expect(f.execute).not.toHaveBeenCalled();
    expect((await f.queue.list())[0]).toMatchObject({ state: { status: 'confirmation_unknown' }, lease: null, canCancel: false });
  });
  it('serializes two tabs claiming the same saved command', async () => {
    const f = fixture(); await save(f); const response = deferred<CommandOutcome>(); f.execute.mockReturnValue(response.promise);
    const second = fixture({ store: f.store }); f.connection.online = second.connection.online = true;
    const firstRun = f.queue.flush(); const secondRun = second.queue.flush(); await ticks();
    expect(f.execute.mock.calls.length + second.execute.mock.calls.length).toBe(1);
    const row = (await f.store.list())[0]; response.resolve({ kind: 'confirmed', receipt: receipt(row.command) }); await Promise.all([firstRun, secondRun]);
    await vi.advanceTimersByTimeAsync(400);
    expect(f.execute.mock.calls.length + second.execute.mock.calls.length).toBe(1);
    expect(f.confirmed.mock.calls.length + second.confirmed.mock.calls.length).toBe(1);
  });
  it('does not announce twice if a suspended tab resumes after another tab reclaimed its expired lease', async () => {
    const f = fixture(); await save(f); const response = deferred<CommandOutcome>(); f.execute.mockReturnValue(response.promise);
    f.connection.online = true; const firstRun = f.queue.flush(); await ticks();
    // Advance the clock without running the suspended tab's timeout handler.
    vi.setSystemTime(Date.now() + 400);
    const second = fixture({ store: f.store }); await send(second);
    response.resolve({ kind: 'confirmed', receipt: receipt((await f.store.list())[0].command) }); await firstRun;
    expect(f.confirmed).not.toHaveBeenCalled(); expect(second.confirmed).toHaveBeenCalledTimes(1);
    expect(f.execute.mock.calls[0][0]).toEqual(second.execute.mock.calls[0][0]);
  });
  it('rechecks the retry cap inside the atomic claim if another tab changed the snapshot', async () => {
    const disk = new MemoryQueueStore(); let raced = false;
    const store = { insert: disk.insert.bind(disk), list: disk.list.bind(disk), update: async (...args: Parameters<MemoryQueueStore['update']>) => {
      if (!raced) { raced = true; await disk.update(args[0], row => ({ ...row, attempts: 3, everSent: true, state: { status: 'confirmation_unknown', command: row.command }, problem: unknownProblem(), lease: null })); }
      return disk.update(...args);
    } };
    const f = fixture({ store }); await save(f); await send(f);
    expect(f.execute).not.toHaveBeenCalled(); expect((await disk.list())[0].attempts).toBe(3);
  });
  it('preserves action order while an earlier response is unknown', async () => {
    const f = fixture({ maxAutomaticAttempts: 1 }); const first = await save(f); await save(f, 'reward_delete');
    f.execute.mockResolvedValue({ kind: 'confirmation_unknown', problem: unknownProblem() }); await send(f);
    expect(f.execute).toHaveBeenCalledTimes(1); expect((await f.store.list())[1].state.status).toBe('pending');
    f.execute.mockImplementation(async value => ({ kind: 'confirmed', receipt: receipt(value) })); await f.queue.retry(first.command.commandId);
    expect(f.execute.mock.calls.map(args => args[0].kind)).toEqual(['reward_buy', 'reward_buy', 'reward_delete']);
  });
  it('does not turn a later pre-idempotency rejection into proof that an earlier request failed', async () => {
    const f = fixture(); const entry = await save(f); f.execute.mockResolvedValueOnce({ kind: 'confirmation_unknown', problem: unknownProblem() }); await send(f);
    f.execute.mockResolvedValue({ kind: 'rejected', problem: { code: 'ACCOUNTING_NOT_ENABLED', message: 'Not enabled', retryable: false } });
    await f.queue.retry(entry.command.commandId);
    expect((await f.store.list())[0]).toMatchObject({ state: { status: 'confirmation_unknown' }, problem: { code: 'ACCOUNTING_NOT_ENABLED' } });
    expect(f.confirmed).not.toHaveBeenCalled(); expect(await f.queue.cancelUnsent(entry.command.commandId)).toBe(false);
  });
  it('keeps a first definitive rejection and its dependency for review without blocking the next action', async () => {
    const f = fixture(); await save(f); await save(f, 'reward_delete');
    f.execute.mockResolvedValueOnce({ kind: 'rejected', problem: { code: 'UNDO_USE_FIRST', message: 'Undo use first', dependencyEventId: uuid(20), retryable: false } }); await send(f);
    expect((await f.store.list())[0]).toMatchObject({ state: { status: 'rejected' }, problem: { dependencyEventId: uuid(20) } }); expect(f.confirmed).toHaveBeenCalledTimes(1);
  });
  it('keeps the displayed Buy cost across offline replay and retries; accepting a changed price is a new intent', async () => {
    const f = fixture(); const entry = await save(f);
    f.execute.mockResolvedValue({ kind: 'rejected', problem: { code: 'REWARD_COST_CHANGED', expectedCost: 20, currentCost: 30, message: 'Review the new price', retryable: false } });
    await send(f); await f.queue.retry(entry.command.commandId);
    expect(f.execute).toHaveBeenCalledTimes(2);
    expect(f.execute.mock.calls.every(([sent]) => sent.commandId === entry.command.commandId && sent.kind === 'reward_buy' && sent.expectedCost === 20)).toBe(true);
    expect(f.confirmed).not.toHaveBeenCalled();
    f.connection.online = false;
    const reviewed = await f.queue.enqueue({ kind: 'reward_buy', rewardId: uuid(5), expectedCost: 30 });
    expect(reviewed.command.commandId).not.toBe(entry.command.commandId);
    expect((await f.store.list())[0].command).toEqual(entry.command);
  });
  it('does not lose an explicit retry queued while another command is in flight', async () => {
    const f = fixture({ maxAutomaticAttempts: 1 }); const failed = await save(f); const later = await save(f);
    f.execute.mockResolvedValueOnce({ kind: 'rejected', problem: { code: 'TIMEZONE_REQUIRED', message: 'Timezone needed', retryable: false } });
    const response = deferred<CommandOutcome>(); f.execute.mockReturnValueOnce(response.promise);
    f.connection.online = true; const run = f.queue.flush(); await ticks();
    const retry = f.queue.retry(failed.command.commandId); await ticks();
    response.resolve({ kind: 'confirmed', receipt: receipt(later.command) }); await Promise.all([run, retry]); await ticks();
    expect(f.execute.mock.calls.map(args => args[0].commandId)).toEqual([failed.command.commandId, later.command.commandId, failed.command.commandId]);
  });
  it('captures timeout as unknown and ignores a late success until same-ID reconciliation', async () => {
    const f = fixture({ maxAutomaticAttempts: 1 }); await save(f); const response = deferred<CommandOutcome>(); f.execute.mockReturnValue(response.promise);
    f.connection.online = true; const run = f.queue.flush(); await ticks(); await vi.advanceTimersByTimeAsync(100); await run;
    expect((await f.store.list())[0]).toMatchObject({ state: { status: 'confirmation_unknown' }, problem: { code: 'REQUEST_TIMEOUT' } });
    response.resolve({ kind: 'confirmed', receipt: receipt((await f.store.list())[0].command) }); await ticks(); expect(f.confirmed).not.toHaveBeenCalled();
  });
  it('aborts on sign-out and preserves uncertainty without leaking old-account feedback', async () => {
    const f = fixture(); await save(f); const response = deferred<CommandOutcome>(); f.execute.mockReturnValue(response.promise);
    f.connection.online = true; const run = f.queue.flush(); await ticks(); f.queue.setContext(null); await run;
    expect((await f.store.list())[0].state.status).toBe('confirmation_unknown'); expect(f.confirmed).not.toHaveBeenCalled(); expect(await f.queue.list()).toEqual([]);
    response.resolve({ kind: 'confirmed', receipt: receipt((await f.store.list())[0].command) }); await ticks(); expect(f.confirmed).not.toHaveBeenCalled();
  });
  it('does not project a response until the confirmation is durably saved', async () => {
    const store = new MemoryQueueStore(); const f = fixture({ store }); await save(f);
    f.execute.mockImplementation(async value => { store.failUpdate = true; return { kind: 'confirmed', receipt: receipt(value) }; });
    await expect(send(f)).rejects.toThrow('Disk unavailable'); expect(f.confirmed).not.toHaveBeenCalled();
    store.failUpdate = false; expect((await store.list())[0].state.status).toBe('sending');
  });
  it('retains confirmation if a UI listener or invalidation callback throws', async () => {
    const observerError = vi.fn(); const f = fixture({ onConfirmed: () => { throw new Error('UI failed'); }, onObserverError: observerError });
    f.queue.subscribe(() => { throw new Error('Listener failed'); }); await save(f); await send(f);
    expect((await f.store.list())[0].state.status).toBe('confirmed'); expect(observerError).toHaveBeenCalled(); expect(f.storageError).not.toHaveBeenCalled();
  });
  it('defensively rejects mismatched receipts even from an injected adapter', async () => {
    const f = fixture(); await save(f); f.execute.mockImplementation(async value => ({ kind: 'confirmed', receipt: { ...receipt(value), relationshipId: uuid(99) } })); await send(f);
    expect((await f.store.list())[0]).toMatchObject({ state: { status: 'confirmation_unknown' }, problem: { code: 'INVALID_RECEIPT', retryable: false } }); expect(f.confirmed).not.toHaveBeenCalled();
  });
});
