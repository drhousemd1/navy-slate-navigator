import { decodeDeletionRecord, type DeletionRecord } from './types';
export interface DeletionStore { list(backend: string): Promise<DeletionRecord[]>; save(record: DeletionRecord, expectedJob: string | null): Promise<void>; remove(record: DeletionRecord): Promise<void> }
export function createDeletionStore(factory: IDBFactory = globalThis.indexedDB): DeletionStore {
  async function transaction<T>(mode: IDBTransactionMode, perform: (store: IDBObjectStore, done: (value: T) => void, fail: () => void) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      let db: IDBDatabase | undefined; let tx: IDBTransaction | undefined; let result: T; let finished = false;
      const finish = (failed = false) => { if (finished) return; finished = true; clearTimeout(timer); db?.close(); if (failed) reject(new Error('Deletion recovery could not be saved or read safely.')); else resolve(result); };
      const fail = () => { try { tx?.abort(); } catch { /* Already settled. */ } finish(true); };
      const timer = setTimeout(fail, 5_000);
      try {
        const open = factory.open('obedience-account-deletion-v1', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('requests', { keyPath: 'key' });
        open.onerror = open.onblocked = fail;
        open.onsuccess = () => {
          db = open.result; if (finished) { db.close(); return; }
          try { tx = db.transaction('requests', mode, { durability: 'strict' }); tx.onabort = tx.onerror = fail; tx.oncomplete = () => finish(); perform(tx.objectStore('requests'), value => { result = value; }, fail); }
          catch { fail(); }
        };
      } catch { fail(); }
    });
  }
  return {
    list: backend => transaction('readonly', (store, done, fail) => {
      const request = store.getAll(); request.onsuccess = () => { try { done(request.result.map(decodeDeletionRecord).filter(record => record.scope.backendId === backend)); } catch { fail(); } };
    }),
    save: async (record, expectedJob) => {
      decodeDeletionRecord(record);
      await transaction<void>('readwrite', (store, _done, fail) => {
        const request = store.get(record.key); request.onsuccess = () => { try {
          const current = request.result ? decodeDeletionRecord(request.result) : null;
          if ((current?.jobId ?? null) !== expectedJob || current && ((record.cleanupComplete ? current.scope.backendId !== record.scope.backendId || current.scope.accountId !== record.scope.accountId : JSON.stringify(current.scope) !== JSON.stringify(record.scope)) ||
            current.recoveryToken !== record.recoveryToken && !record.cleanupComplete || current.cleanupComplete && !record.cleanupComplete ||
            current.status?.state === 'complete' && record.status?.state !== 'complete')) throw new Error('Changed record');
          store.put(record);
        } catch { fail(); } };
      });
    },
    remove: record => transaction<void>('readwrite', (store, _done, fail) => {
      const request = store.get(record.key); request.onsuccess = () => { try {
        const current = request.result ? decodeDeletionRecord(request.result) : null;
        if (current && (current.jobId !== record.jobId || !(current.cleanupComplete || !current.attempted || current.startRejected && !current.status))) throw new Error('Unconfirmed request');
        store.delete(record.key);
      } catch { fail(); } };
    }),
  };
}
export const deletionStore = createDeletionStore();
