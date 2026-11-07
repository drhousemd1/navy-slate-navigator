
import localforage from 'localforage';
import { Reward } from '@/data/rewards/types';
import { PunishmentData as ContextPunishmentData, PunishmentHistoryItem as ContextPunishmentHistoryItem } from '@/contexts/punishments/types';
import { Rule } from '@/data/interfaces/Rule';
import { Task } from '@/data/tasks/types';
import { logger } from '@/lib/logger';
import { requireUndeletedAccount } from '@/data/accountDeletion/tombstone';
import { supabaseBackendId } from '@/integrations/supabase/client';

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

const DB_NAME = 'appData';
const REWARDS_STORE_NAME = 'rewards';
const TASKS_STORE_NAME = 'tasks';
const RULES_STORE_NAME = 'rules';
const PUNISHMENTS_STORE_NAME = 'punishments';
const PUNISHMENT_HISTORY_STORE_NAME = 'punishmentHistory';
const LAST_SYNC_STORE_NAME = 'lastSyncTimes';
const POINTS_STORE_NAME = 'points';
const DOM_POINTS_STORE_NAME = 'domPoints';
const WELLBEING_STORE_NAME = 'wellbeingSnapshots';
// Configure localforage instance
localforage.config({
  driver: localforage.INDEXEDDB,
  name: DB_NAME,
});

const rewardsStore = localforage.createInstance({ name: DB_NAME, storeName: REWARDS_STORE_NAME });
const tasksStore = localforage.createInstance({ name: DB_NAME, storeName: TASKS_STORE_NAME });
const rulesStore = localforage.createInstance({ name: DB_NAME, storeName: RULES_STORE_NAME });
const punishmentsStore = localforage.createInstance({ name: DB_NAME, storeName: PUNISHMENTS_STORE_NAME });
const punishmentHistoryStore = localforage.createInstance({ name: DB_NAME, storeName: PUNISHMENT_HISTORY_STORE_NAME });
const lastSyncStore = localforage.createInstance({ name: DB_NAME, storeName: LAST_SYNC_STORE_NAME });
const pointsStore = localforage.createInstance({ name: DB_NAME, storeName: POINTS_STORE_NAME });
const domPointsStore = localforage.createInstance({ name: DB_NAME, storeName: DOM_POINTS_STORE_NAME });
const wellbeingStore = localforage.createInstance({ name: DB_NAME, storeName: WELLBEING_STORE_NAME });
// NOTE: Notification preferences removed from IndexedDB to fix mobile cache conflicts

// Namespace selection never deletes offline work. Legacy unscoped keys remain
// quarantined until the offline migration can classify pending versus cached rows.
// Request-start scope tokens are still required in legacy asynchronous writers
// before relationship lifecycle transitions can be enabled for restored accounts.
let activeScope: string | null = null;
let activeOwners: ReadonlySet<string> = new Set();
let cacheGeneration = 0;

export async function prepareIdentityCacheScope(scope: string | null, userIds: readonly string[]): Promise<void> {
  cacheGeneration++;
  activeScope = scope;
  activeOwners = new Set(userIds);
}

const getUserKey = (baseKey: string, userId: string | null): string => {
  if (!activeScope || (userId && !activeOwners.has(userId))) throw new Error('Identity cache scope is not ready for this account.');
  return `${baseKey}:${activeScope}:${userId ?? 'shared'}`;
};

type CacheStore = ReturnType<typeof localforage.createInstance>;
const belongsToScope = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.every(belongsToScope);
  if (value && typeof value === 'object') {
    return 'user_id' in value && typeof value.user_id === 'string' && activeOwners.has(value.user_id);
  }
  return true;
};

async function readCached<T>(store: CacheStore, key: string): Promise<T | null> {
  const scope = activeScope;
  const generation = cacheGeneration;
  const value = await store.getItem<T>(key);
  return scope && generation === cacheGeneration && scope === activeScope && belongsToScope(value) ? value : null;
}

async function writeCached<T>(store: CacheStore, key: string, value: T): Promise<T> {
  if (!activeScope || !belongsToScope(value)) throw new Error('Cached data does not belong to the current account or partner.');
  const account = JSON.parse(activeScope)[0];
  if (typeof account === 'string') requireUndeletedAccount(supabaseBackendId, account);
  return store.setItem(key, value);
}

// Rewards specific functions
export const loadRewardsFromDB = async (userId?: string | null): Promise<Reward[] | null> => {
  try {
    const key = getUserKey('allRewards', userId || null);
    const rewards = await readCached<Reward[]>(rewardsStore, key);
    return rewards;
  } catch (error) {
    logger.error('Error loading rewards from IndexedDB:', error);
    return null;
  }
};

export const saveRewardsToDB = async (rewards: Reward[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allRewards', userId || null);
    await writeCached(rewardsStore, key, rewards);
  } catch (error) {
    logger.error('Error saving rewards to IndexedDB:', error);
  }
};

export const getLastSyncTimeForRewards = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('rewardsLastSync', userId || null);
    return await readCached<string>(lastSyncStore, key);
  } catch (error) {
    logger.error('Error getting last sync time for rewards:', error);
    return null;
  }
};

export const setLastSyncTimeForRewards = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('rewardsLastSync', userId || null);
    await writeCached(lastSyncStore, key, time);
  } catch (error) {
    logger.error('Error setting last sync time for rewards:', error);
  }
};

// Tasks specific functions
export const loadTasksFromDB = async (userId?: string | null): Promise<Task[] | null> => {
  try {
    const key = getUserKey('allTasks', userId || null);
    return await readCached<Task[]>(tasksStore, key);
  } catch (error) {
    logger.error('Error loading tasks from IndexedDB:', error);
    return null;
  }
};

export const saveTasksToDB = async (tasks: Task[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allTasks', userId || null);
    await writeCached(tasksStore, key, tasks);
  } catch (error) {
    logger.error('Error saving tasks to IndexedDB:', error);
  }
};

export const getLastSyncTimeForTasks = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('tasksLastSync', userId || null);
    return await readCached<string>(lastSyncStore, key);
  } catch (error) {
    logger.error('Error getting last sync time for tasks:', error);
    return null;
  }
};

export const setLastSyncTimeForTasks = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('tasksLastSync', userId || null);
    await writeCached(lastSyncStore, key, time);
  } catch (error) {
    logger.error('Error setting last sync time for tasks:', error);
  }
};

// Rules specific functions
export const loadRulesFromDB = async (userId?: string | null): Promise<Rule[] | null> => {
  try {
    const key = getUserKey('allRules', userId || null);
    return await readCached<Rule[]>(rulesStore, key);
  } catch (error) {
    logger.error('Error loading rules from IndexedDB:', error);
    return null;
  }
};

export const saveRulesToDB = async (rules: Rule[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allRules', userId || null);
    await writeCached(rulesStore, key, rules);
  } catch (error) {
    logger.error('Error saving rules to IndexedDB:', error);
  }
};

export const getLastSyncTimeForRules = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('rulesLastSync', userId || null);
    return await readCached<string>(lastSyncStore, key);
  } catch (error) {
    logger.error('Error getting last sync time for rules:', error);
    return null;
  }
};

export const setLastSyncTimeForRules = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('rulesLastSync', userId || null);
    await writeCached(lastSyncStore, key, time);
  } catch (error) {
    logger.error('Error setting last sync time for rules:', error);
  }
};

// Punishments specific functions
export const loadPunishmentsFromDB = async (userId?: string | null): Promise<PunishmentData[] | null> => {
  try {
    const key = getUserKey('allPunishments', userId || null);
    const punishments = await readCached<PunishmentData[]>(punishmentsStore, key);
    return punishments;
  } catch (error) {
    logger.error('Error loading punishments from IndexedDB:', error);
    return null;
  }
};

export const savePunishmentsToDB = async (punishments: PunishmentData[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allPunishments', userId || null);
    await writeCached(punishmentsStore, key, punishments.filter(p => p.id));
  } catch (error) {
    logger.error('Error saving punishments to IndexedDB:', error);
  }
};

export const getLastSyncTimeForPunishments = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('punishmentsLastSync', userId || null);
    return await readCached<string>(lastSyncStore, key);
  } catch (error) {
    logger.error('Error getting last sync time for punishments:', error);
    return null;
  }
};

export const setLastSyncTimeForPunishments = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('punishmentsLastSync', userId || null);
    await writeCached(lastSyncStore, key, time);
  } catch (error) {
    logger.error('Error setting last sync time for punishments:', error);
  }
};

// Punishment History specific functions
export const loadPunishmentHistoryFromDB = async (userId?: string | null): Promise<PunishmentHistory[] | null> => {
  try {
    const key = getUserKey('allPunishmentHistory', userId || null);
    const history = await readCached<PunishmentHistory[]>(punishmentHistoryStore, key);
    return history;
  } catch (error) {
    logger.error('Error loading punishment history from IndexedDB:', error);
    return null;
  }
};

export const savePunishmentHistoryToDB = async (history: PunishmentHistory[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allPunishmentHistory', userId || null);
    await writeCached(punishmentHistoryStore, key, history);
  } catch (error) {
    logger.error('Error saving punishment history to IndexedDB:', error);
  }
};

// Points specific functions
export const savePointsToDB = async (points: number, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('userPoints', userId || null);
    await writeCached(pointsStore, key, points);
  } catch (error) {
    logger.error('Error saving points to IndexedDB:', error);
  }
};

export const loadPointsFromDB = async (userId?: string | null): Promise<number | null> => {
  try {
    const key = getUserKey('userPoints', userId || null);
    return await readCached<number>(pointsStore, key);
  } catch (error) {
    logger.error('Error loading points from IndexedDB:', error);
    return null;
  }
};

// Dom Points specific functions
export const saveDomPointsToDB = async (points: number, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('userDomPoints', userId || null);
    await writeCached(domPointsStore, key, points);
  } catch (error) {
    logger.error('Error saving dom points to IndexedDB:', error);
  }
};

export const loadDomPointsFromDB = async (userId?: string | null): Promise<number | null> => {
  try {
    const key = getUserKey('userDomPoints', userId || null);
    return await readCached<number>(domPointsStore, key);
  } catch (error) {
    logger.error('Error loading dom points from IndexedDB:', error);
    return null;
  }
};

// Wellbeing specific functions
export const loadWellbeingFromDB = async (userId?: string | null): Promise<WellbeingSnapshot | null> => {
  try {
    const key = getUserKey('latestWellbeing', userId || null);
    const wellbeing = await readCached<WellbeingSnapshot>(wellbeingStore, key);
    return wellbeing;
  } catch (error) {
    logger.error('Error loading wellbeing from IndexedDB:', error);
    return null;
  }
};

export const saveWellbeingToDB = async (wellbeing: WellbeingSnapshot, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('latestWellbeing', userId || null);
    await writeCached(wellbeingStore, key, wellbeing);
  } catch (error) {
    logger.error('Error saving wellbeing to IndexedDB:', error);
  }
};

export const getLastSyncTimeForWellbeing = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('wellbeingLastSync', userId || null);
    return await readCached<string>(lastSyncStore, key);
  } catch (error) {
    logger.error('Error getting last sync time for wellbeing:', error);
    return null;
  }
};

export const setLastSyncTimeForWellbeing = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('wellbeingLastSync', userId || null);
    await writeCached(lastSyncStore, key, time);
  } catch (error) {
    logger.error('Error setting last sync time for wellbeing:', error);
  }
};

// Notification Preferences functions REMOVED to fix mobile cache conflicts
// Notification settings now use ONLY direct Supabase calls for reliability

// Explicit cleanup of this user's keys in the active namespace only. Identity
// refresh never calls this; quarantined legacy/offline rows are retained.
export const clearUserDataFromDB = async (userId: string): Promise<void> => {
  try {
    const userKeys = [
      getUserKey('allRewards', userId),
      getUserKey('allTasks', userId),
      getUserKey('allRules', userId),
      getUserKey('allPunishments', userId),
      getUserKey('allPunishmentHistory', userId),
      getUserKey('userPoints', userId),
      getUserKey('userDomPoints', userId),
      getUserKey('latestWellbeing', userId),
      getUserKey('rewardsLastSync', userId),
      getUserKey('tasksLastSync', userId),
      getUserKey('rulesLastSync', userId),
      getUserKey('punishmentsLastSync', userId),
      getUserKey('wellbeingLastSync', userId),
    ];

    await Promise.all([
      ...userKeys.map(key => rewardsStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => tasksStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => rulesStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => punishmentsStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => punishmentHistoryStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => pointsStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => domPointsStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => wellbeingStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => lastSyncStore.removeItem(key).catch(() => {})),
    ]);

    logger.debug(`Cleared IndexedDB data for user: ${userId}`);
  } catch (error) {
    logger.error('Error clearing user data from IndexedDB:', error);
  }
};
