import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/data/tasks/types';

const stores = vi.hoisted(() => new Map<string, {
  values: Map<string, unknown>; clear: ReturnType<typeof vi.fn>; getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn>;
}>());
vi.mock('localforage', () => ({ default: { INDEXEDDB: 'indexeddb', config: vi.fn(), createInstance: ({ storeName }: { storeName: string }) => {
  const values = new Map<string, unknown>();
  const store = { values, clear: vi.fn(async () => values.clear()), getItem: vi.fn(async (key: string) => values.get(key) ?? null), setItem: vi.fn(async (key: string, value: unknown) => { values.set(key, value); return value; }), removeItem: vi.fn(async (key: string) => { values.delete(key); }) };
  stores.set(storeName, store);
  return store;
} } }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://cache.invalid' }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));
import { markDeletedAccount } from '@/data/accountDeletion/tombstone';
import { prepareIdentityCacheScope, saveTasksToDB, loadTasksFromDB, savePointsToDB, loadPointsFromDB } from '@/data/indexedDB/useIndexedDB';
const cacheScope = (account: string, period: string) => JSON.stringify([account, period, 'session', account, null]);
const row = (owner: string, title: string) => ({ id: title, user_id: owner, title }) as Task;
beforeEach(async () => {
  localStorage.clear();
  for (const store of stores.values()) { store.values.clear(); store.getItem.mockClear(); store.setItem.mockClear(); store.clear.mockClear(); }
  await prepareIdentityCacheScope(null, []);
});

describe('account and relationship cache quarantine', () => {
  it('keeps old unscoped/offline data intact but never rehydrates it into a new namespace', async () => {
    const store = stores.get('tasks')!;
    store.values.set('allTasks', [row('A', 'legacy pending')]);
    await prepareIdentityCacheScope(cacheScope('A', 'period-1'), ['A', 'D']);
    expect(await loadTasksFromDB()).toBeNull();
    await saveTasksToDB([row('A', 'current task')]);
    await prepareIdentityCacheScope(null, []);
    await prepareIdentityCacheScope(cacheScope('A', 'period-1'), ['A', 'D']);
    expect(await loadTasksFromDB()).toEqual([row('A', 'current task')]);
    expect(store.values.get('allTasks')).toEqual([row('A', 'legacy pending')]);
    expect([...stores.values()].every(store => store.clear.mock.calls.length === 0)).toBe(true);
  });

  it('isolates B and a fresh period for the same A/D pair, preserving each old namespace', async () => {
    await prepareIdentityCacheScope(cacheScope('A', 'period-1'), ['A', 'D']);
    await saveTasksToDB([row('D', 'shared task')]);
    await savePointsToDB(12, 'A');
    await prepareIdentityCacheScope(cacheScope('B', 'period-1'), ['B']);
    expect(await loadTasksFromDB()).toBeNull();
    expect(await loadPointsFromDB('A')).toBeNull();
    await saveTasksToDB([row('A', 'foreign late row')]);
    expect(await loadTasksFromDB()).toBeNull();
    await prepareIdentityCacheScope(cacheScope('A', 'period-2'), ['A', 'D']);
    expect(await loadTasksFromDB()).toBeNull();
    expect(await loadPointsFromDB('A')).toBeNull();
    await prepareIdentityCacheScope(cacheScope('A', 'period-1'), ['A', 'D']);
    expect(await loadTasksFromDB()).toEqual([row('D', 'shared task')]);
    expect(await loadPointsFromDB('A')).toBe(12);
  });

  it('discards a read that resolves after switching away and back to the same namespace', async () => {
    await prepareIdentityCacheScope(cacheScope('A', 'period-1'), ['A']);
    let resolve!: (rows: Task[]) => void;
    stores.get('tasks')!.getItem.mockReturnValueOnce(new Promise<Task[]>(yes => { resolve = yes; }));
    const read = loadTasksFromDB();
    await prepareIdentityCacheScope(cacheScope('B', 'period-1'), ['B']);
    await prepareIdentityCacheScope(cacheScope('A', 'period-1'), ['A']);
    resolve([row('A', 'old response')]);
    expect(await read).toBeNull();
  });
  it('rejects late writes for a deleted account and continues writing a different account', async () => {
    await prepareIdentityCacheScope(cacheScope('A', 'period-1'), ['A']);
    markDeletedAccount('https://cache.invalid', 'A');
    await saveTasksToDB([row('A', 'late deleted row')]); expect(stores.get('tasks')!.setItem).not.toHaveBeenCalled();
    await prepareIdentityCacheScope(cacheScope('B', 'period-1'), ['B']);
    await saveTasksToDB([row('B', 'current B row')]); expect(await loadTasksFromDB()).toEqual([row('B', 'current B row')]);
  });

});
