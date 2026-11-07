import { describe, expect, it, vi } from 'vitest';
import { createDeletionStore } from '@/data/accountDeletion/store';
import { complete, id, record, scope } from './account-deletion.helpers';

/** Small transactional adapter to exercise this store's CAS and commit ordering.
 * It is not a substitute for the parent's native IndexedDB/browser check. */
function factoryFixture() {
  const values = new Map<string, unknown>(); const transactions: string[] = [];
  const factory = { open: () => {
    const open: Record<string, unknown> = {};
    queueMicrotask(() => {
      open.result = { close: vi.fn(), transaction: (_store: string, mode: string, options: unknown) => {
        transactions.push(JSON.stringify([mode, options])); const working = new Map(values); let aborted = false;
        const tx: Record<string, unknown> = { abort: () => { if (aborted) return; aborted = true; (tx.onabort as () => void)?.(); } };
        const result = (value: unknown) => { const request: Record<string, unknown> = {}; queueMicrotask(() => { request.result = structuredClone(value); (request.onsuccess as () => void)?.(); queueMicrotask(() => {
          if (!aborted) { if (mode === 'readwrite') { values.clear(); for (const [key, item] of working) values.set(key, item); } (tx.oncomplete as () => void)?.(); }
        }); }); return request; };
        tx.objectStore = () => ({ get: (key: string) => result(working.get(key)), getAll: () => result([...working.values()]), put: (row: { key: string }) => working.set(row.key, structuredClone(row)), delete: (key: string) => working.delete(key) }); return tx;
      } }; (open.onsuccess as () => void)();
    }); return open;
  } } as unknown as IDBFactory;
  return { store: createDeletionStore(factory), values, transactions };
}
describe('durable deletion store', () => {
  it('atomically saves one request per backend/account and refuses replacement while it is unresolved', async () => {
    const f = factoryFixture(); const row = record(); await f.store.save(row, null);
    expect(await f.store.list(scope.backendId)).toEqual([row]); expect(f.transactions.some(value => value.includes('strict'))).toBe(true);
    await expect(f.store.save({ ...record(), jobId: id(77) }, null)).rejects.toThrow('safely'); expect(await f.store.list(scope.backendId)).toEqual([row]);
    await expect(f.store.save({ ...row, recoveryToken: 'a'.repeat(43) }, row.jobId)).rejects.toThrow('safely');
  });
  it('never removes an uncertain request, but permits definitive rejection and completed notice dismissal', async () => {
    const f = factoryFixture(); const row = { ...record(), attempted: true }; await f.store.save(row, null); await expect(f.store.remove(row)).rejects.toThrow();
    const rejected = { ...row, startRejected: 'DELETION_BUSY' }; await f.store.save(rejected, row.jobId); await f.store.remove(rejected); expect(await f.store.list(scope.backendId)).toEqual([]);
    await f.store.save(row, null); const done = { ...row, scope: { ...scope, relationshipId: null, relationshipSessionId: null }, status: complete(row.jobId), cleanupComplete: true, recoveryToken: null };
    await f.store.save(done, row.jobId); expect(await f.store.list(scope.backendId)).toEqual([done]); await expect(f.store.save(row, row.jobId)).rejects.toThrow(); await f.store.remove(done); expect(f.values.size).toBe(0);
  });
  it('keeps another backend/account intact and rejects malformed durable records', async () => {
    const f = factoryFixture(); const own = record(), other = { ...record(), key: JSON.stringify([scope.backendId, id(99)]), scope: { ...scope, accountId: id(99) } };
    await f.store.save(own, null); await f.store.save(other, null); await f.store.remove(own); expect(await f.store.list(scope.backendId)).toEqual([other]);
    f.values.set('bad', { recoveryToken: 'not-a-record' }); await expect(f.store.list(scope.backendId)).rejects.toThrow('safely');
  });
  it('fails closed when IndexedDB is unavailable', async () => { await expect(createDeletionStore(undefined).list(scope.backendId)).rejects.toThrow('safely'); });
});
