import { readCacheFactory } from './read-cache-fake';
import { prepareIdentityCacheScope, captureCacheToken, saveTasksToDB, READ_CACHE_DATABASE, READ_CACHE_STORE, legacyQueryKey } from '@/data/indexedDB/useIndexedDB';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://deletion.invalid', supabase: { rpc: vi.fn(), auth: { getSession: vi.fn() } } }));
vi.mock('@/data/wellbeing/api', () => ({ validateMetrics: (value: unknown) => value }));
vi.mock('@/data/wellbeing/scope', () => ({ wellbeingScopeKey: (value: { backendId: string; accountId: string; relationshipId: string; relationshipSessionId: string }) => [value.backendId, value.accountId, value.relationshipId, value.relationshipSessionId] }));
import { cleanupDeletedAccount, ownsDeletionQuery, purgeOwnedDatabase, purgeOwnedLocalStorage } from '@/data/accountDeletion/cleanup';
import { isDeletedAccount, markDeletedAccount, requireUndeletedAccount } from '@/data/accountDeletion/tombstone';
import { scope, id } from './account-deletion.helpers';
import { storeWellbeingDraft } from '@/data/wellbeing/draft';

/** Transaction/cursor adapter only: native browser IDB remains parent verification. */
function cursorFactory(rows: unknown[], fail = false): IDBFactory {
  return { databases: async () => [], open: () => {
    const open: Record<string, unknown> = {};
    queueMicrotask(() => {
      if (fail) { (open.onerror as () => void)(); return; }
      const tx: Record<string, unknown> = { abort: () => (tx.onabort as () => void)?.() };
      open.result = { close: vi.fn(), objectStoreNames: { contains: () => true }, transaction: () => tx };
      tx.objectStore = () => ({ openCursor: () => {
        let index = 0; const request: Record<string, unknown> = {};
        const next = () => queueMicrotask(() => {
          request.result = index < rows.length ? { value: rows[index], delete: () => { rows.splice(index--, 1); }, continue: () => { index++; next(); } } : null;
          (request.onsuccess as () => void)(); if (request.result === null) queueMicrotask(() => (tx.oncomplete as () => void)());
        }); next(); return request;
      } }); (open.onsuccess as () => void)();
    }); return open;
  } } as unknown as IDBFactory;
}
const editor = (backend = scope.backendId, account = scope.accountId, version = 3) => `obedience-editor-draft:v${version}:${JSON.stringify([backend, account, scope.relationshipId, scope.relationshipSessionId, 'form'])}`;
beforeEach(() => localStorage.clear());
describe('exact account/backend deletion cleanup', () => {
  it('removes all owned periods while preserving other accounts, other backends and unowned legacy drafts', () => {
    const own = [editor(), editor(scope.backendId, scope.accountId, 2), `obedience:wellbeing:v1:${JSON.stringify([scope.backendId, scope.accountId, id(8), id(9)])}`];
    const kept = [editor(scope.backendId, id(10)), editor('https://other.invalid'), 'kingdom-app-form-old', `unknown-${scope.accountId}`, 'APP_QUERY_CACHE'];
    [...own, ...kept].forEach(key => localStorage.setItem(key, 'original')); expect(purgeOwnedLocalStorage(localStorage, scope)).toBe(true);
    own.forEach(key => expect(localStorage.getItem(key)).toBeNull()); kept.forEach(key => expect(localStorage.getItem(key)).toBe('original'));
  });
  it('clears only the matching push binding, never the shared device ID or another account binding', () => {
    const device = `obedience:push-device:v1:${scope.backendId}`, binding = `${device}:binding`, ownTest = `obedience:push-test:v1:${scope.backendId}:${scope.accountId}:device`;
    localStorage.setItem(device, 'device'); localStorage.setItem(binding, JSON.stringify({ accountId: id(10) })); localStorage.setItem(ownTest, 'pending');
    purgeOwnedLocalStorage(localStorage, scope); expect(localStorage.getItem(device)).toBe('device'); expect(localStorage.getItem(binding)).toContain(id(10)); expect(localStorage.getItem(ownTest)).toBeNull();
    localStorage.setItem(binding, JSON.stringify({ accountId: scope.accountId })); purgeOwnedLocalStorage(localStorage, scope); expect(localStorage.getItem(binding)).toBeNull();
  });
  it('does not hide a failed removal of provably owned bytes as a legacy limitation', () => {
    localStorage.setItem(editor(), 'draft'); vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => { throw new Error('denied'); });
    expect(() => purgeOwnedLocalStorage(localStorage, scope)).toThrow('denied'); expect(localStorage.getItem(editor())).toBe('draft');
  });
  it.each([false, true])('deletes exact IDB row ownership without account substring matching (role=%s)', async role => {
    const row = (owner: unknown) => role ? { intent: { scope: owner } } : { scope: owner };
    const other = row({ ...scope, accountId: id(10) }), backend = row({ ...scope, backendId: 'https://other.invalid' }), unknown = { key: scope.accountId };
    const rows = [row(scope), row({ ...scope, relationshipId: id(77) }), other, backend, unknown];
    expect(await purgeOwnedDatabase(cursorFactory(rows), 'db', 'rows', scope, role)).toBe(true); expect(rows).toEqual([other, backend, unknown]);
  });
  it('reports a failed scoped transaction and leaves the recovery decision to the caller', async () => {
    await expect(purgeOwnedDatabase(cursorFactory([], true), 'db', 'rows', scope)).rejects.toThrow('cleanup');
  });
  it('cancels/removes modern owned queries, preserves other and unattributable queries, and records a durable no-more-writes boundary', async () => {
    const client = new QueryClient(); const own = ['wellbeing-v2', scope.backendId, scope.accountId, scope.relationshipId]; const other = ['task-action-state', scope.backendId, id(8)]; const legacy = ['profile', scope.accountId];
    client.setQueryData(own, { private: 'own' }); client.setQueryData(other, { private: 'other' }); client.setQueryData(legacy, { unknownBackend: true });
    const result = await cleanupDeletedAccount(scope, client, cursorFactory([]));
    expect(client.getQueryData(own)).toBeUndefined(); expect(client.getQueryData(other)).toEqual({ private: 'other' }); expect(client.getQueryData(legacy)).toEqual({ unknownBackend: true });
    expect(result.legacyPreserved).toBe(true); expect(isDeletedAccount(scope.backendId, scope.accountId)).toBe(true); expect(() => requireUndeletedAccount(scope.backendId, scope.accountId)).toThrow();
    expect(() => requireUndeletedAccount(scope.backendId, id(10))).not.toThrow(); expect(() => requireUndeletedAccount('https://other.invalid', scope.accountId)).not.toThrow();
  });
  it('matches only known structural query schemas', () => {
    expect(ownsDeletionQuery(['activity-metrics', 'week', scope.backendId, scope.accountId, 'period'], scope)).toBe(true);
    expect(ownsDeletionQuery(['arbitrary', scope.backendId, scope.accountId], scope)).toBe(false);
    expect(ownsDeletionQuery(['wellbeing-v2', 'prefix' + scope.backendId, scope.accountId], scope)).toBe(false);
  });
  it('rejects late wellbeing persistence after deletion instead of recreating the draft', () => {
    markDeletedAccount(scope.backendId, scope.accountId);
    expect(() => storeWellbeingDraft({ version: 1, scope, metrics: {} as never, pending: null }, null)).toThrow('This account was deleted');
    expect(localStorage.length).toBe(1);
  });
  it('cleans the new owned snapshots across periods while preserving unknown rows, other accounts and backends', async () => {
    const fake = readCacheFactory(); vi.stubGlobal('indexedDB', fake.factory);
    const client = new QueryClient();
    for (const current of [scope, { ...scope, relationshipId: id(77) }, { ...scope, accountId: id(90) }, { ...scope, backendId: 'https://other.invalid' }]) {
      await prepareIdentityCacheScope(current, [current.accountId]); const token = captureCacheToken(); await saveTasksToDB([], token);
      client.setQueryData(legacyQueryKey(['tasks'], token), []);
    }
    const rows = fake.rows(READ_CACHE_DATABASE, READ_CACHE_STORE); rows.set('unknown', { old: 'keep' });
    const result = await cleanupDeletedAccount(scope, client, fake.factory);
    expect(rows.size).toBe(3); expect(rows.get('unknown')).toEqual({ old: 'keep' }); expect(result.legacyPreserved).toBe(true);
    for (const row of rows.values()) if ('scope' in (row as object)) expect((row as { scope: typeof scope }).scope.accountId !== scope.accountId || (row as { scope: typeof scope }).scope.backendId !== scope.backendId).toBe(true);
    expect(client.getQueryCache().getAll()).toHaveLength(2);
  });

});
