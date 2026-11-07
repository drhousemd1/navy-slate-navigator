import type { QueryClient } from '@tanstack/react-query';
import { forgetAccountRecovery } from '@/lib/offline/recovery';
import { markDeletedAccount } from './tombstone';
import type { DeletionScope } from './types';

type Owner = Pick<DeletionScope, 'backendId' | 'accountId'>;
function owned(value: unknown, scope: Owner): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Owner>;
  return candidate.backendId === scope.backendId && candidate.accountId === scope.accountId;
}
const scopedQueries = new Set(['task-action-state', 'reward-action-state', 'action-accounting-status', 'recording-action-state',
  'wellbeing-v2', 'wellbeing-date-v2', 'wellbeing-series-v2', 'wellness-reminder']);
export function ownsDeletionQuery(key: readonly unknown[], scope: Owner): boolean {
  const offset = key[0] === 'activity-metrics' ? 2 : scopedQueries.has(String(key[0])) ? 1 : -1;
  return offset >= 0 && key[offset] === scope.backendId && key[offset + 1] === scope.accountId;
}

/** Never create a missing database just to clean it. Unknown rows remain intact. */
export function purgeOwnedDatabase(factory: IDBFactory, name: string, storeName: string, scope: Owner, role = false): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let db: IDBDatabase | undefined, tx: IDBTransaction | undefined, absent = false, finished = false, unknown = false;
    const finish = (failed = false) => { if (finished) return; finished = true; clearTimeout(timer); db?.close(); if (failed) reject(new Error('Scoped device cleanup needs another attempt.')); else resolve(unknown); };
    const fail = () => { try { tx?.abort(); } catch { /* Already settled. */ } finish(true); };
    const timer = setTimeout(fail, 5_000);
    try {
      const open = factory.open(name);
      open.onupgradeneeded = () => { absent = true; open.transaction?.abort(); };
      open.onerror = () => absent ? finish() : fail(); open.onblocked = fail;
      open.onsuccess = () => {
        db = open.result; if (finished) { db.close(); return; }
        if (!db.objectStoreNames.contains(storeName)) { unknown = db.objectStoreNames.length > 0; finish(); return; }
        tx = db.transaction(storeName, 'readwrite', { durability: 'strict' }); tx.onerror = tx.onabort = fail; tx.oncomplete = () => finish();
        const cursor = tx.objectStore(storeName).openCursor(); cursor.onsuccess = () => {
          const item = cursor.result; if (!item) return;
          const owner = role ? item.value?.intent?.scope : item.value?.scope;
          if (owned(owner, scope)) item.delete(); else if (!owner?.backendId || !owner?.accountId) unknown = true;
          item.continue();
        };
      };
    } catch { fail(); }
  });
}

export function purgeOwnedLocalStorage(storage: Storage, scope: Owner): boolean {
  let unknown = false;
  for (const key of Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => key !== null)) {
    const prefix = ['obedience:wellbeing:v1:', 'obedience-editor-draft:v3:', 'obedience-editor-draft:v2:'].find(value => key.startsWith(value));
    if (prefix) {
      let parts: unknown; try { parts = JSON.parse(key.slice(prefix.length)); } catch { unknown = true; }
      if (Array.isArray(parts) && parts[0] === scope.backendId && parts[1] === scope.accountId) storage.removeItem(key);
    } else if (key === `obedience:push-device:v1:${scope.backendId}:binding` || key === `obedience-recovery-v1:${encodeURIComponent(scope.backendId)}`) {
      const raw = storage.getItem(key); let value: { accountId?: string; scope?: unknown } | null = null;
      try { value = JSON.parse(raw ?? 'null'); } catch { unknown = true; }
      if (key.endsWith(':binding') ? value?.accountId === scope.accountId : owned(value?.scope, scope)) storage.removeItem(key);
    } else if (key.startsWith(`obedience:push-test:v1:${scope.backendId}:${scope.accountId}:`)) storage.removeItem(key);
    else if (key === `sb-${new URL(scope.backendId).hostname.split('.')[0]}-auth-token-code-verifier`) unknown = true;
    else if (key.startsWith('kingdom-app-form-') || key === 'APP_QUERY_CACHE' || key === 'REACT_QUERY_OFFLINE_CACHE') unknown = true;
  }
  return unknown;
}

export async function cleanupDeletedAccount(scope: Owner, client: QueryClient, factory: IDBFactory = indexedDB, storage: Storage = localStorage) {
  // The Auth boundary has unmounted this account's domain providers. A durable
  // tombstone also rejects already queued writes, including across other tabs.
  markDeletedAccount(scope.backendId, scope.accountId);
  const predicate = (query: { queryKey: readonly unknown[] }) => ownsDeletionQuery(query.queryKey, scope);
  await client.cancelQueries({ predicate });
  const unknownQueries = client.getQueryCache().getAll().some(query => query.state.data !== undefined && !predicate(query) && !ownsKnownOtherQuery(query.queryKey, scope));
  client.removeQueries({ predicate });
  for (const mutation of client.getMutationCache().getAll()) if (mutation.options.mutationKey && ownsDeletionQuery(mutation.options.mutationKey, scope)) client.getMutationCache().remove(mutation);
  const unknownRows = await Promise.all([
    purgeOwnedDatabase(factory, 'obedience-action-commands-v1', 'commands', scope),
    purgeOwnedDatabase(factory, 'obedience-role-transitions-v1', 'requests', scope, true),
    purgeOwnedDatabase(factory, 'obedience-message-drafts', 'drafts', scope),
  ]);
  const unknownLocal = purgeOwnedLocalStorage(storage, scope);
  forgetAccountRecovery(scope.backendId, scope.accountId);
  // appData and old localforage form/query blobs have no backend ownership.
  // Their presence must not keep a live deletion capability indefinitely.
  let legacyDatabase = true;
  if (typeof factory.databases === 'function') {
    try { legacyDatabase = (await factory.databases()).some(database => database.name === 'appData' || database.name === 'localforage'); } catch { /* Ownership cannot be established. */ }
  }
  return { legacyPreserved: unknownQueries || unknownLocal || unknownRows.some(Boolean) || legacyDatabase };
}
function ownsKnownOtherQuery(key: readonly unknown[], scope: Owner) {
  const offset = key[0] === 'activity-metrics' ? 2 : scopedQueries.has(String(key[0])) ? 1 : -1;
  return offset >= 0 && typeof key[offset] === 'string' && typeof key[offset + 1] === 'string' && (key[offset] !== scope.backendId || key[offset + 1] !== scope.accountId);
}
