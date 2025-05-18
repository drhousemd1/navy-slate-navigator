import localforage from 'localforage';
import { Reward } from '@/data/rewards/types'; // Corrected import path

const DB_NAME = 'appData';
const REWARDS_STORE_NAME = 'rewards';
const LAST_SYNC_STORE_NAME = 'lastSyncTimes';

// Configure localforage instance
localforage.config({
  driver: localforage.INDEXEDDB,
  name: DB_NAME,
});

const rewardsStore = localforage.createInstance({ name: DB_NAME, storeName: REWARDS_STORE_NAME });
const lastSyncStore = localforage.createInstance({ name: DB_NAME, storeName: LAST_SYNC_STORE_NAME });

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

// Generic functions for other data types can be added here following the same pattern
// Example for tasks:
// const TASKS_STORE_NAME = 'tasks';
// const tasksStore = localforage.createInstance({ name: DB_NAME, storeName: TASKS_STORE_NAME });
// export const loadTasksFromDB = async () => { /* ... */ };
// export const saveTasksToDB = async (tasks) => { /* ... */ };
