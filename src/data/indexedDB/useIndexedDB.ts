import type { Reward } from '@/data/rewards/types';
import type { PunishmentData as ContextPunishmentData, PunishmentHistoryItem as ContextPunishmentHistoryItem } from '@/contexts/punishments/types';
import type { Rule } from '@/data/interfaces/Rule';
import type { Task } from '@/data/tasks/types';
import { requireUndeletedAccount } from '@/data/accountDeletion/tombstone';

// Wellbeing snapshot type
export interface WellbeingSnapshot {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metrics: Record<string, number>;
  overall_score: number;
}

// Use imported types for consistency
export type PunishmentData = ContextPunishmentData;
export type PunishmentHistory = ContextPunishmentHistoryItem;

/** Fresh, attributable server snapshots only. Never open or adopt appData/localforage. */
export const READ_CACHE_DATABASE = 'obedience-read-cache-v1';
export const READ_CACHE_STORE = 'snapshots';
export interface CacheScope { backendId: string; accountId: string; relationshipId: string | null; relationshipSessionId: string | null }
export interface CacheToken { readonly scope: Readonly<CacheScope>; readonly owners: readonly string[]; readonly generation: number }
export interface CacheSnapshot<T> { version: 1; scope: CacheScope; resource: string; subject: string | null; savedAt: string; data: T }
let current: CacheToken | null = null;
let generation = 0;
const transactions = new Set<IDBTransaction>();

export async function prepareIdentityCacheScope(scope: CacheScope | null, owners: readonly string[]): Promise<void> {
  generation++;
  for (const tx of transactions) { try { tx.abort(); } catch { /* Already completed. */ } }
  current = scope ? Object.freeze({ scope: Object.freeze({ ...scope }), owners: Object.freeze([...owners]), generation }) : null;
}
export const captureCacheToken = (): CacheToken | null => current;
export function requireCurrentCacheToken(token: CacheToken | null): asserts token is CacheToken {
  if (!token || token !== current || token.generation !== generation) throw new Error('This account or relationship session changed. Retry in the current account.');
  requireUndeletedAccount(token.scope.backendId, token.scope.accountId);
}
export function isCurrentCacheToken(token: CacheToken | null): token is CacheToken {
  try { requireCurrentCacheToken(token); return true; } catch { return false; }
}
export function invalidateAccountCacheScope(backendId: string, accountId: string) {
  if (current?.scope.backendId === backendId && current.scope.accountId === accountId) void prepareIdentityCacheScope(null, []);
}
export function legacyQueryKey(key: readonly unknown[], token: CacheToken | null = current): unknown[] {
  return [key[0], 'owned-v1', token?.scope.backendId ?? null, token?.scope.accountId ?? null,
    token?.scope.relationshipId ?? null, token?.scope.relationshipSessionId ?? null, ...key.slice(1)];
}
export function ownsLegacyQuery(key: readonly unknown[], owner: Partial<Pick<CacheScope, 'backendId' | 'accountId'>>): boolean {
  return ['tasks', 'rules', 'rewards', 'punishments', 'punishment-history', 'userPoints', 'userDomPoints'].includes(String(key[0])) && key[1] === 'owned-v1' && key[2] === owner.backendId && key[3] === owner.accountId;
}
const scopeKey = (scope: CacheScope) => JSON.stringify([scope.backendId, scope.accountId, scope.relationshipId, scope.relationshipSessionId]);
const keyFor = (scope: CacheScope, resource: string, subject: string | null) => JSON.stringify([scopeKey(scope), resource, subject]);
function checkSubject(token: CacheToken, subject: string | null) {
  if (subject && !token.owners.includes(subject)) throw new Error('This cached subject is outside the current relationship.');
}
function checkRows(token: CacheToken, value: unknown): boolean {
  if (Array.isArray(value)) return value.every(item => checkRows(token, item));
  if (value && typeof value === 'object' && 'user_id' in value) return typeof value.user_id === 'string' && token.owners.includes(value.user_id);
  return true;
}
function openCache(factory: IDBFactory = globalThis.indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!factory) { reject(new Error('Device cache storage is unavailable.')); return; }
    const request = factory.open(READ_CACHE_DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(READ_CACHE_STORE); };
    request.onerror = request.onblocked = () => reject(new Error('Device cache storage could not be opened.'));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function readCacheSnapshot<T>(resource: string, token: CacheToken | null, subject: string | null = null): Promise<CacheSnapshot<T> | null> {
  if (!isCurrentCacheToken(token)) return null;
  checkSubject(token, subject);
  let db: IDBDatabase;
  try { db = await openCache(); } catch { return null; }
  if (!isCurrentCacheToken(token)) { db.close(); return null; }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(READ_CACHE_STORE, 'readonly'); transactions.add(tx);
    const request = tx.objectStore(READ_CACHE_STORE).get(keyFor(token.scope, resource, subject));
    const finish = () => { transactions.delete(tx); db.close(); };
    tx.oncomplete = () => {
      finish(); const row = request.result as CacheSnapshot<T> | undefined;
      resolve(isCurrentCacheToken(token) && row?.version === 1 && row.resource === resource && row.subject === subject &&
        row.scope && scopeKey(row.scope) === scopeKey(token.scope) && typeof row.savedAt === 'string' && checkRows(token, row.data) ? row : null);
    };
    tx.onabort = tx.onerror = () => { finish(); resolve(null); };
  });
}
export async function writeCacheSnapshot<T>(resource: string, data: T, token: CacheToken | null, subject: string | null = null): Promise<void> {
  requireCurrentCacheToken(token); checkSubject(token, subject);
  if (!checkRows(token, data)) throw new Error('Cached rows do not belong to the requested relationship.');
  const db = await openCache();
  try { requireCurrentCacheToken(token); } catch (error) { db.close(); throw error; }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(READ_CACHE_STORE, 'readwrite', { durability: 'strict' }); transactions.add(tx);
    const row: CacheSnapshot<T> = { version: 1, scope: { ...token.scope }, resource, subject, savedAt: new Date().toISOString(), data };
    tx.objectStore(READ_CACHE_STORE).put(row, keyFor(token.scope, resource, subject));
    const finish = () => { transactions.delete(tx); db.close(); };
    tx.oncomplete = () => { finish(); resolve(); };
    tx.onabort = tx.onerror = () => { finish(); reject(new Error('The device cache write was cancelled or failed.')); };
  });
}
const read = async <T>(resource: string, token: CacheToken | null, subject?: string | null) => (await readCacheSnapshot<T>(resource, token, subject ?? null))?.data ?? null;
const sync = async (resource: string, token: CacheToken | null, subject?: string | null) => (await readCacheSnapshot(resource, token, subject ?? null))?.savedAt ?? null;

export const loadRewardsFromDB = (token: CacheToken | null, userId?: string | null) => read<Reward[]>('rewards', token, userId);
export const saveRewardsToDB = (value: Reward[], token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('rewards', value, token, userId ?? null);
export const getLastSyncTimeForRewards = (token: CacheToken | null, userId?: string | null) => sync('rewards', token, userId);

export const loadTasksFromDB = (token: CacheToken | null, userId?: string | null) => read<Task[]>('tasks', token, userId);
export const saveTasksToDB = (value: Task[], token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('tasks', value, token, userId ?? null);
export const getLastSyncTimeForTasks = (token: CacheToken | null, userId?: string | null) => sync('tasks', token, userId);

export const loadRulesFromDB = (token: CacheToken | null, userId?: string | null) => read<Rule[]>('rules', token, userId);
export const saveRulesToDB = (value: Rule[], token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('rules', value, token, userId ?? null);
export const getLastSyncTimeForRules = (token: CacheToken | null, userId?: string | null) => sync('rules', token, userId);

export const loadPunishmentsFromDB = (token: CacheToken | null, userId?: string | null) => read<PunishmentData[]>('punishments', token, userId);
export const savePunishmentsToDB = (value: PunishmentData[], token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('punishments', value, token, userId ?? null);
export const getLastSyncTimeForPunishments = (token: CacheToken | null, userId?: string | null) => sync('punishments', token, userId);

export const loadPunishmentHistoryFromDB = (token: CacheToken | null, userId?: string | null) => read<PunishmentHistory[]>('punishmentHistory', token, userId);
export const savePunishmentHistoryToDB = (value: PunishmentHistory[], token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('punishmentHistory', value, token, userId ?? null);

export const loadPointsFromDB = (token: CacheToken | null, userId?: string | null) => read<number>('points', token, userId);
export const savePointsToDB = (value: number, token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('points', value, token, userId ?? null);

export const loadDomPointsFromDB = (token: CacheToken | null, userId?: string | null) => read<number>('domPoints', token, userId);
export const saveDomPointsToDB = (value: number, token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('domPoints', value, token, userId ?? null);

export const loadWellbeingFromDB = (token: CacheToken | null, userId?: string | null) => read<WellbeingSnapshot>('wellbeing', token, userId);
export const saveWellbeingToDB = (value: WellbeingSnapshot, token: CacheToken | null, userId?: string | null) => writeCacheSnapshot('wellbeing', value, token, userId ?? null);
export const getLastSyncTimeForWellbeing = (token: CacheToken | null, userId?: string | null) => sync('wellbeing', token, userId);

export const readResetMarker = (resource: 'taskDaily' | 'taskWeekly' | 'ruleWeekly', token: CacheToken | null) => read<string>(`reset:${resource}`, token);
export const writeResetMarker = (resource: 'taskDaily' | 'taskWeekly' | 'ruleWeekly', value: string, token: CacheToken | null) => writeCacheSnapshot(`reset:${resource}`, value, token);
