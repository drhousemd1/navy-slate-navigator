import { RoleTransitionError } from './api';
import { decodeRoleReceipt, recordSchema, type RoleRecord } from './types';

export interface RoleStore { read(backend: string, account: string): Promise<RoleRecord | null>; save(record: RoleRecord, expectedCommand: string | null): Promise<void>; remove(record: RoleRecord): Promise<void> }
export function checkedRoleRecord(value: unknown, backend: string, account: string): RoleRecord | null {
  if (value === undefined || value === null) return null;
  const record = recordSchema.parse(value);
  if (record.intent.scope.backendId !== backend || record.intent.scope.accountId !== account || (record.status === 'completed') !== (record.receipt !== null)) throw new Error('INVALID_ROLE_STORAGE');
  if (record.receipt) decodeRoleReceipt(record.receipt, record.intent);
  return record;
}
/** One atomic record per backend/account. Independent from action queues and drafts. */
export function createRoleStore(factory: IDBFactory = globalThis.indexedDB): RoleStore {
  const transact = <T>(backend: string, account: string, mutate?: (current: RoleRecord | null, store: IDBObjectStore, key: string) => T): Promise<T | RoleRecord | null> => new Promise((resolve, reject) => {
    let db: IDBDatabase | undefined; let tx: IDBTransaction | undefined; let finished = false; let result: T | RoleRecord | null = null;
    const end = (error?: unknown) => { if (finished) return; finished = true; clearTimeout(timer); db?.close(); if (error) reject(error); else resolve(result); };
    const timer = setTimeout(() => { try { tx?.abort(); } catch { /* Already finished. */ } end(new RoleTransitionError('ROLE_STORAGE_UNAVAILABLE')); }, 5_000);
    try {
      const request = factory.open('obedience-role-transitions-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('requests');
      request.onerror = () => end(new RoleTransitionError('ROLE_STORAGE_UNAVAILABLE'));
      request.onsuccess = () => {
        db = request.result; if (finished) { db.close(); return; }
        tx = db.transaction('requests', mutate ? 'readwrite' : 'readonly', { durability: 'strict' }); const store = tx.objectStore('requests'); const key = JSON.stringify([backend, account]);
        tx.onerror = tx.onabort = () => end(new RoleTransitionError('ROLE_STORAGE_UNAVAILABLE')); tx.oncomplete = () => end();
        const read = store.get(key);
        read.onsuccess = () => { try { const current = checkedRoleRecord(read.result, backend, account); result = mutate ? mutate(current, store, key) : current; }
          catch (error) { try { tx?.abort(); } catch { /* Already finished. */ } end(error); } };
      };
    } catch { end(new RoleTransitionError('ROLE_STORAGE_UNAVAILABLE')); }
  });
  return {
    read: (backend, account) => transact<RoleRecord>(backend, account) as Promise<RoleRecord | null>,
    save: async (record, expectedCommand) => {
      checkedRoleRecord(record, record.intent.scope.backendId, record.intent.scope.accountId);
      await transact(record.intent.scope.backendId, record.intent.scope.accountId, (current, store, key) => {
        if ((current?.intent.commandId ?? null) !== expectedCommand) throw new RoleTransitionError('ROLE_STORAGE_CHANGED');
        if (current && (JSON.stringify(current.intent) !== JSON.stringify(record.intent) || current.status === 'completed' && record.status !== 'completed')) throw new RoleTransitionError('ROLE_STORAGE_CHANGED');
        store.put(record, key);
      });
    },
    remove: async record => { await transact(record.intent.scope.backendId, record.intent.scope.accountId, (current, store, key) => {
      if (current && (current.intent.commandId !== record.intent.commandId || current.status !== record.status)) throw new RoleTransitionError('ROLE_STORAGE_CHANGED');
      if (current?.status === 'pending') throw new RoleTransitionError('ROLE_STORAGE_CHANGED');
      store.delete(key);
    }); },
  };
}
export const roleStore = createRoleStore();
