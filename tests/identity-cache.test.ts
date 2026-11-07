import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/data/tasks/types';
import { readCacheFactory } from './read-cache-fake';
import { markDeletedAccount } from '@/data/accountDeletion/tombstone';
import { prepareIdentityCacheScope, captureCacheToken, saveTasksToDB, loadTasksFromDB, savePointsToDB, loadPointsFromDB,
  saveDomPointsToDB, loadDomPointsFromDB, readCacheSnapshot, readResetMarker, writeResetMarker, READ_CACHE_DATABASE, READ_CACHE_STORE, type CacheScope } from '@/data/indexedDB/useIndexedDB';
const scope = (account = 'A', period = 'p1', session = 's1', backend = 'https://cache.invalid'): CacheScope => ({ backendId: backend, accountId: account, relationshipId: period, relationshipSessionId: session });
const row = (owner: string, title: string) => ({ id: title, user_id: owner, title }) as Task;
let fake: ReturnType<typeof readCacheFactory>;
const select = async (owner = scope(), users = ['A', 'D']) => { await prepareIdentityCacheScope(owner, users); return captureCacheToken()!; };
beforeEach(async () => { localStorage.clear(); fake = readCacheFactory(); vi.stubGlobal('indexedDB', fake.factory); await prepareIdentityCacheScope(null, []); });

describe('owned server-snapshot cache', () => {
  it('never opens, adopts or erases old appData/localforage bytes', async () => {
    const old = fake.rows('appData', 'tasks'); old.set('allTasks', [row('A', 'unknown pending')]);
    fake.rows('localforage', 'keyvaluepairs').set('APP_QUERY_CACHE', 'unknown');
    const token = await select(); expect(await loadTasksFromDB(token)).toBeNull();
    await saveTasksToDB([row('D', 'shared')], token);
    expect(old.get('allTasks')).toEqual([row('A', 'unknown pending')]);
    expect(new Set(fake.opened)).toEqual(new Set([READ_CACHE_DATABASE]));
  });
  it('isolates every backend/account/period/session and retains the original shared snapshot', async () => {
    const first = await select(); await saveTasksToDB([row('D', 'shared')], first);
    for (const changed of [scope('B'), scope('A', 'p2'), scope('A', 'p1', 's2'), scope('A', 'p1', 's1', 'https://other.invalid')]) {
      const token = await select(changed, [changed.accountId, 'D']); expect(await loadTasksFromDB(token)).toBeNull();
    }
    expect(await loadTasksFromDB(await select())).toEqual([row('D', 'shared')]);
  });
  it('rejects a request-start token after session change and after leaving then returning', async () => {
    const token = await select(); await select(scope('A', 'p1', 's2'));
    await expect(saveTasksToDB([row('A', 'late')], token)).rejects.toThrow('changed');
    await select(); await expect(saveTasksToDB([row('A', 'late again')], token)).rejects.toThrow('changed');
    expect(await loadTasksFromDB(captureCacheToken())).toBeNull();
  });
  it('discards reads whose database open resolves after a transition', async () => {
    const token = await select(); await saveTasksToDB([row('A', 'saved')], token);
    fake.control.holdOpen = true; const pending = loadTasksFromDB(token); await select(scope('B'), ['B']); fake.releaseOpens();
    expect(await pending).toBeNull(); expect(await loadTasksFromDB(await select())).toEqual([row('A', 'saved')]);
  });
  it('aborts an already-open write when the identity generation changes', async () => {
    const token = await select(); fake.control.holdCommit = true;
    const pending = saveTasksToDB([row('A', 'late')], token); const rejection = expect(pending).rejects.toThrow('cancelled');
    await new Promise(resolve => setTimeout(resolve, 0)); await select(scope('B'), ['B']); fake.releaseCommits(); await rejection;
    expect(await loadTasksFromDB(await select())).toBeNull();
  });
  it('rechecks a deletion tombstone after an asynchronous open before creating a row', async () => {
    const token = await select(); fake.control.holdOpen = true; const pending = saveTasksToDB([row('A', 'late')], token);
    const rejection = expect(pending).rejects.toThrow('deleted'); markDeletedAccount(token.scope.backendId, 'A'); fake.releaseOpens(); await rejection;
    expect(fake.rows(READ_CACHE_DATABASE, READ_CACHE_STORE).size).toBe(0);
    const other = await select(scope('B'), ['B']); await saveTasksToDB([row('B', 'valid')], other); expect(await loadTasksFromDB(other)).toEqual([row('B', 'valid')]);
  });
  it('stores empty data, exact signed balances and sync time in their own single envelopes', async () => {
    const token = await select(); await saveTasksToDB([], token); await savePointsToDB(0, token, 'A'); await saveDomPointsToDB(-19, token, 'D');
    expect(await loadTasksFromDB(token)).toEqual([]); expect(await loadPointsFromDB(token, 'A')).toBe(0); expect(await loadDomPointsFromDB(token, 'D')).toBe(-19);
    const snapshot = await readCacheSnapshot('tasks', token); expect(snapshot).toMatchObject({ version: 1, scope: token.scope, resource: 'tasks', data: [] }); expect(Date.parse(snapshot!.savedAt)).toBeGreaterThan(0);
    expect([...fake.rows(READ_CACHE_DATABASE, READ_CACHE_STORE).values()].every(value => !!(value as { savedAt: string }).savedAt)).toBe(true);
  });
  it('does not trust a malformed or foreign envelope, or save foreign row ownership', async () => {
    const token = await select(); await saveTasksToDB([row('A', 'valid')], token);
    const rows = fake.rows(READ_CACHE_DATABASE, READ_CACHE_STORE); const key = [...rows.keys()][0]; rows.set(key, { version: 1, resource: 'tasks', subject: null, data: ['unknown'] });
    expect(await loadTasksFromDB(token)).toBeNull(); expect(rows.size).toBe(1);
    await expect(saveTasksToDB([row('B', 'foreign')], token)).rejects.toThrow('requested relationship');
  });
  it('keeps task and rule reset schedules separate, owned and isolated from old global markers', async () => {
    localStorage.setItem('lastDaily', 'yesterday'); localStorage.setItem('lastWeek', 'old week');
    const token = await select(); expect(await readResetMarker('taskDaily', token)).toBeNull();
    await writeResetMarker('taskWeekly', '2026-W45', token); expect(await readResetMarker('ruleWeekly', token)).toBeNull();
    expect(await readResetMarker('taskWeekly', await select(scope('B'), ['B']))).toBeNull();
    expect(localStorage.getItem('lastWeek')).toBe('old week'); expect(localStorage.getItem('lastDaily')).toBe('yesterday');
  });
});
