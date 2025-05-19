
import localforage from 'localforage';
import { Reward } from '@/data/rewards/types';
import { PunishmentData as ContextPunishmentData, PunishmentHistoryItem as ContextPunishmentHistoryItem } from '@/contexts/punishments/types';

// Define types for other entities or import them if they exist elsewhere
export interface Task { id: string; [key: string]: any; }
export interface Rule { id: string; [key: string]: any; }

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
const POINTS_STORE_NAME = 'points'; // For general points
const DOM_POINTS_STORE_NAME = 'domPoints'; // For dom points


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

// Rewards specific functions
export const loadRewardsFromDB = async (): Promise<Reward[] | null> => {
  try {
    const rewards = await rewardsStore.getItem<Reward[]>('allRewards');
    return rewards;
  } catch (error) {
    console.error('Error loading rewards from IndexedDB:', error);
    return null;
  }
};

export const saveRewardsToDB = async (rewards: Reward[]): Promise<void> => {
  try {
    await rewardsStore.setItem('allRewards', rewards);
  } catch (error) {
    console.error('Error saving rewards to IndexedDB:', error);
  }
};

export const getLastSyncTimeForRewards = async (): Promise<string | null> => {
  try {
    return await lastSyncStore.getItem<string>('rewardsLastSync');
  } catch (error) {
    console.error('Error getting last sync time for rewards:', error);
    return null;
  }
};

export const setLastSyncTimeForRewards = async (time: string): Promise<void> => {
  try {
    await lastSyncStore.setItem('rewardsLastSync', time);
  } catch (error) {
    console.error('Error setting last sync time for rewards:', error);
  }
};

// Tasks specific functions
export const loadTasksFromDB = async (): Promise<Task[] | null> => {
  try {
    return await tasksStore.getItem<Task[]>('allTasks');
  } catch (error) {
    console.error('Error loading tasks from IndexedDB:', error);
    return null;
  }
};

export const saveTasksToDB = async (tasks: Task[]): Promise<void> => {
  try {
    await tasksStore.setItem('allTasks', tasks);
  } catch (error) {
    console.error('Error saving tasks to IndexedDB:', error);
  }
};

export const getLastSyncTimeForTasks = async (): Promise<string | null> => {
  try {
    return await lastSyncStore.getItem<string>('tasksLastSync');
  } catch (error) {
    console.error('Error getting last sync time for tasks:', error);
    return null;
  }
};

export const setLastSyncTimeForTasks = async (time: string): Promise<void> => {
  try {
    await lastSyncStore.setItem('tasksLastSync', time);
  } catch (error) {
    console.error('Error setting last sync time for tasks:', error);
  }
};

// Rules specific functions
export const loadRulesFromDB = async (): Promise<Rule[] | null> => {
  try {
    return await rulesStore.getItem<Rule[]>('allRules');
  } catch (error) {
    console.error('Error loading rules from IndexedDB:', error);
    return null;
  }
};

export const saveRulesToDB = async (rules: Rule[]): Promise<void> => {
  try {
    await rulesStore.setItem('allRules', rules);
  } catch (error) {
    console.error('Error saving rules to IndexedDB:', error);
  }
};

export const getLastSyncTimeForRules = async (): Promise<string | null> => {
  try {
    return await lastSyncStore.getItem<string>('rulesLastSync');
  } catch (error) {
    console.error('Error getting last sync time for rules:', error);
    return null;
  }
};

export const setLastSyncTimeForRules = async (time: string): Promise<void> => {
  try {
    await lastSyncStore.setItem('rulesLastSync', time);
  } catch (error) {
    console.error('Error setting last sync time for rules:', error);
  }
};

// Punishments specific functions
export const loadPunishmentsFromDB = async (): Promise<PunishmentData[] | null> => {
  try {
    // Ensure the loaded data conforms to PunishmentData (which is ContextPunishmentData)
    const punishments = await punishmentsStore.getItem<PunishmentData[]>('allPunishments');
    return punishments;
  } catch (error) {
    console.error('Error loading punishments from IndexedDB:', error);
    return null;
  }
};

export const savePunishmentsToDB = async (punishments: PunishmentData[]): Promise<void> => {
  try {
    // punishments should be ContextPunishmentData[] here, which has id?: string
    // Ensure items actually stored have IDs, or handle appropriately if needed
    await punishmentsStore.setItem('allPunishments', punishments.filter(p => p.id));
  } catch (error) {
    console.error('Error saving punishments to IndexedDB:', error);
  }
};

export const getLastSyncTimeForPunishments = async (): Promise<string | null> => {
  try {
    return await lastSyncStore.getItem<string>('punishmentsLastSync');
  } catch (error) {
    console.error('Error getting last sync time for punishments:', error);
    return null;
  }
};

export const setLastSyncTimeForPunishments = async (time: string): Promise<void> => {
  try {
    await lastSyncStore.setItem('punishmentsLastSync', time);
  } catch (error) {
    console.error('Error setting last sync time for punishments:', error);
  }
};

// Punishment History specific functions
export const loadPunishmentHistoryFromDB = async (): Promise<PunishmentHistory[] | null> => {
  try {
    // Ensure the loaded data conforms to PunishmentHistory (which is ContextPunishmentHistoryItem)
    const history = await punishmentHistoryStore.getItem<PunishmentHistory[]>('allPunishmentHistory');
    return history;
  } catch (error) {
    console.error('Error loading punishment history from IndexedDB:', error);
    return null;
  }
};

export const savePunishmentHistoryToDB = async (history: PunishmentHistory[]): Promise<void> => {
  try {
    await punishmentHistoryStore.setItem('allPunishmentHistory', history);
  } catch (error) {
    console.error('Error saving punishment history to IndexedDB:', error);
  }
};

// Points specific functions
export const savePointsToDB = async (points: number): Promise<void> => {
  try {
    await pointsStore.setItem('userPoints', points);
  } catch (error) {
    console.error('Error saving points to IndexedDB:', error);
  }
};

export const loadPointsFromDB = async (): Promise<number | null> => {
  try {
    return await pointsStore.getItem<number>('userPoints');
  } catch (error) {
    console.error('Error loading points from IndexedDB:', error);
    return null;
  }
};

// Dom Points specific functions
export const saveDomPointsToDB = async (points: number): Promise<void> => {
  try {
    await domPointsStore.setItem('userDomPoints', points);
  } catch (error) {
    console.error('Error saving dom points to IndexedDB:', error);
  }
};

export const loadDomPointsFromDB = async (): Promise<number | null> => {
  try {
    return await domPointsStore.getItem<number>('userDomPoints');
  } catch (error) {
    console.error('Error loading dom points from IndexedDB:', error);
    return null;
  }
};
