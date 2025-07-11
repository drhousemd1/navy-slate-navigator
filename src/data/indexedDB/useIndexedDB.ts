
import localforage from 'localforage';
import { Reward } from '@/data/rewards/types';
import { PunishmentData as ContextPunishmentData, PunishmentHistoryItem as ContextPunishmentHistoryItem } from '@/contexts/punishments/types';
import { Rule } from '@/data/interfaces/Rule';
import { Task } from '@/data/tasks/types';
import { logger } from '@/lib/logger';

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
const NOTIFICATION_PREFERENCES_STORE_NAME = 'notificationPreferences';

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
const notificationPreferencesStore = localforage.createInstance({ name: DB_NAME, storeName: NOTIFICATION_PREFERENCES_STORE_NAME });

// Helper function to create user-specific keys
const getUserKey = (baseKey: string, userId: string | null): string => {
  return userId ? `${baseKey}_${userId}` : baseKey;
};

// Rewards specific functions
export const loadRewardsFromDB = async (userId?: string | null): Promise<Reward[] | null> => {
  try {
    const key = getUserKey('allRewards', userId || null);
    const rewards = await rewardsStore.getItem<Reward[]>(key);
    return rewards;
  } catch (error) {
    logger.error('Error loading rewards from IndexedDB:', error);
    return null;
  }
};

export const saveRewardsToDB = async (rewards: Reward[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allRewards', userId || null);
    await rewardsStore.setItem(key, rewards);
  } catch (error) {
    logger.error('Error saving rewards to IndexedDB:', error);
  }
};

export const getLastSyncTimeForRewards = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('rewardsLastSync', userId || null);
    return await lastSyncStore.getItem<string>(key);
  } catch (error) {
    logger.error('Error getting last sync time for rewards:', error);
    return null;
  }
};

export const setLastSyncTimeForRewards = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('rewardsLastSync', userId || null);
    await lastSyncStore.setItem(key, time);
  } catch (error) {
    logger.error('Error setting last sync time for rewards:', error);
  }
};

// Tasks specific functions
export const loadTasksFromDB = async (userId?: string | null): Promise<Task[] | null> => {
  try {
    const key = getUserKey('allTasks', userId || null);
    return await tasksStore.getItem<Task[]>(key);
  } catch (error) {
    logger.error('Error loading tasks from IndexedDB:', error);
    return null;
  }
};

export const saveTasksToDB = async (tasks: Task[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allTasks', userId || null);
    await tasksStore.setItem(key, tasks);
  } catch (error) {
    logger.error('Error saving tasks to IndexedDB:', error);
  }
};

export const getLastSyncTimeForTasks = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('tasksLastSync', userId || null);
    return await lastSyncStore.getItem<string>(key);
  } catch (error) {
    logger.error('Error getting last sync time for tasks:', error);
    return null;
  }
};

export const setLastSyncTimeForTasks = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('tasksLastSync', userId || null);
    await lastSyncStore.setItem(key, time);
  } catch (error) {
    logger.error('Error setting last sync time for tasks:', error);
  }
};

// Rules specific functions
export const loadRulesFromDB = async (userId?: string | null): Promise<Rule[] | null> => {
  try {
    const key = getUserKey('allRules', userId || null);
    return await rulesStore.getItem<Rule[]>(key);
  } catch (error) {
    logger.error('Error loading rules from IndexedDB:', error);
    return null;
  }
};

export const saveRulesToDB = async (rules: Rule[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allRules', userId || null);
    await rulesStore.setItem(key, rules);
  } catch (error) {
    logger.error('Error saving rules to IndexedDB:', error);
  }
};

export const getLastSyncTimeForRules = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('rulesLastSync', userId || null);
    return await lastSyncStore.getItem<string>(key);
  } catch (error) {
    logger.error('Error getting last sync time for rules:', error);
    return null;
  }
};

export const setLastSyncTimeForRules = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('rulesLastSync', userId || null);
    await lastSyncStore.setItem(key, time);
  } catch (error) {
    logger.error('Error setting last sync time for rules:', error);
  }
};

// Punishments specific functions
export const loadPunishmentsFromDB = async (userId?: string | null): Promise<PunishmentData[] | null> => {
  try {
    const key = getUserKey('allPunishments', userId || null);
    const punishments = await punishmentsStore.getItem<PunishmentData[]>(key);
    return punishments;
  } catch (error) {
    logger.error('Error loading punishments from IndexedDB:', error);
    return null;
  }
};

export const savePunishmentsToDB = async (punishments: PunishmentData[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allPunishments', userId || null);
    await punishmentsStore.setItem(key, punishments.filter(p => p.id));
  } catch (error) {
    logger.error('Error saving punishments to IndexedDB:', error);
  }
};

export const getLastSyncTimeForPunishments = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('punishmentsLastSync', userId || null);
    return await lastSyncStore.getItem<string>(key);
  } catch (error) {
    logger.error('Error getting last sync time for punishments:', error);
    return null;
  }
};

export const setLastSyncTimeForPunishments = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('punishmentsLastSync', userId || null);
    await lastSyncStore.setItem(key, time);
  } catch (error) {
    logger.error('Error setting last sync time for punishments:', error);
  }
};

// Punishment History specific functions
export const loadPunishmentHistoryFromDB = async (userId?: string | null): Promise<PunishmentHistory[] | null> => {
  try {
    const key = getUserKey('allPunishmentHistory', userId || null);
    const history = await punishmentHistoryStore.getItem<PunishmentHistory[]>(key);
    return history;
  } catch (error) {
    logger.error('Error loading punishment history from IndexedDB:', error);
    return null;
  }
};

export const savePunishmentHistoryToDB = async (history: PunishmentHistory[], userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('allPunishmentHistory', userId || null);
    await punishmentHistoryStore.setItem(key, history);
  } catch (error) {
    logger.error('Error saving punishment history to IndexedDB:', error);
  }
};

// Points specific functions
export const savePointsToDB = async (points: number, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('userPoints', userId || null);
    await pointsStore.setItem(key, points);
  } catch (error) {
    logger.error('Error saving points to IndexedDB:', error);
  }
};

export const loadPointsFromDB = async (userId?: string | null): Promise<number | null> => {
  try {
    const key = getUserKey('userPoints', userId || null);
    return await pointsStore.getItem<number>(key);
  } catch (error) {
    logger.error('Error loading points from IndexedDB:', error);
    return null;
  }
};

// Dom Points specific functions
export const saveDomPointsToDB = async (points: number, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('userDomPoints', userId || null);
    await domPointsStore.setItem(key, points);
  } catch (error) {
    logger.error('Error saving dom points to IndexedDB:', error);
  }
};

export const loadDomPointsFromDB = async (userId?: string | null): Promise<number | null> => {
  try {
    const key = getUserKey('userDomPoints', userId || null);
    return await domPointsStore.getItem<number>(key);
  } catch (error) {
    logger.error('Error loading dom points from IndexedDB:', error);
    return null;
  }
};

// Wellbeing specific functions
export const loadWellbeingFromDB = async (userId?: string | null): Promise<WellbeingSnapshot | null> => {
  try {
    const key = getUserKey('latestWellbeing', userId || null);
    const wellbeing = await wellbeingStore.getItem<WellbeingSnapshot>(key);
    return wellbeing;
  } catch (error) {
    logger.error('Error loading wellbeing from IndexedDB:', error);
    return null;
  }
};

export const saveWellbeingToDB = async (wellbeing: WellbeingSnapshot, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('latestWellbeing', userId || null);
    await wellbeingStore.setItem(key, wellbeing);
  } catch (error) {
    logger.error('Error saving wellbeing to IndexedDB:', error);
  }
};

export const getLastSyncTimeForWellbeing = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('wellbeingLastSync', userId || null);
    return await lastSyncStore.getItem<string>(key);
  } catch (error) {
    logger.error('Error getting last sync time for wellbeing:', error);
    return null;
  }
};

export const setLastSyncTimeForWellbeing = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('wellbeingLastSync', userId || null);
    await lastSyncStore.setItem(key, time);
  } catch (error) {
    logger.error('Error setting last sync time for wellbeing:', error);
  }
};

// Notification Preferences specific functions
export const loadNotificationPreferencesFromDB = async (userId?: string | null): Promise<any> => {
  try {
    const key = getUserKey('notificationPreferences', userId || null);
    const preferences = await notificationPreferencesStore.getItem(key);
    return preferences;
  } catch (error) {
    logger.error('Error loading notification preferences from IndexedDB:', error);
    return null;
  }
};

export const saveNotificationPreferencesToDB = async (preferences: any, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('notificationPreferences', userId || null);
    await notificationPreferencesStore.setItem(key, preferences);
  } catch (error) {
    logger.error('Error saving notification preferences to IndexedDB:', error);
  }
};

export const getLastSyncTimeForNotificationPreferences = async (userId?: string | null): Promise<string | null> => {
  try {
    const key = getUserKey('notificationPreferencesLastSync', userId);
    const time = await lastSyncStore.getItem<string>(key);
    return time;
  } catch (error) {
    logger.error('Error getting last sync time for notification preferences:', error);
    return null;
  }
};

export const setLastSyncTimeForNotificationPreferences = async (time: string, userId?: string | null): Promise<void> => {
  try {
    const key = getUserKey('notificationPreferencesLastSync', userId);
    await lastSyncStore.setItem(key, time);
  } catch (error) {
    logger.error('Error setting last sync time for notification preferences:', error);
  }
};

// Function to clear all data for a specific user
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
      getUserKey('notificationPreferences', userId),
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
      ...userKeys.map(key => notificationPreferencesStore.removeItem(key).catch(() => {})),
      ...userKeys.map(key => lastSyncStore.removeItem(key).catch(() => {})),
    ]);

    logger.debug(`Cleared IndexedDB data for user: ${userId}`);
  } catch (error) {
    logger.error('Error clearing user data from IndexedDB:', error);
  }
};
