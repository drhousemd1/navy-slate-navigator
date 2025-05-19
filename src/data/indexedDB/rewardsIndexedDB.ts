
import { db } from './db';
import { Reward } from '@/data/rewards/types';
import { getLastSyncTime, setLastSyncTime } from './common';

const REWARDS_ENTITY_NAME = 'rewards';

export const loadRewardsFromDB = async (): Promise<Reward[] | null> => {
  try {
    const rewards = await db.rewards.toArray();
    return rewards.length > 0 ? rewards : null;
  } catch (error) {
    console.error("Error loading rewards from IndexedDB:", error);
    return null;
  }
};

export const saveRewardsToDB = async (rewards: Reward[]): Promise<void> => {
  try {
    await db.transaction('rw', db.rewards, async () => {
      await db.rewards.clear(); // Clear existing rewards before saving new set
      await db.rewards.bulkAdd(rewards);
    });
  } catch (error) {
    console.error("Error saving rewards to IndexedDB:", error);
  }
};

export const getRewardByIdFromDB = async (id: string): Promise<Reward | null> => {
  try {
    const reward = await db.rewards.get(id);
    return reward || null;
  } catch (error) {
    console.error(`Error getting reward ${id} from IndexedDB:`, error);
    return null;
  }
};

export const addRewardToDB = async (reward: Reward): Promise<void> => {
  try {
    await db.rewards.add(reward);
  } catch (error) {
    console.error("Error adding reward to IndexedDB:", error);
  }
};

export const updateRewardInDB = async (reward: Reward): Promise<void> => {
  try {
    await db.rewards.put(reward); // put handles both add and update
  } catch (error) {
    console.error("Error updating reward in IndexedDB:", error);
  }
};

export const deleteRewardFromDB = async (id: string): Promise<void> => {
  try {
    await db.rewards.delete(id);
  } catch (error) {
    console.error("Error deleting reward from IndexedDB:", error);
  }
};

export const getLastSyncTimeForRewards = (): Promise<string | null> => {
  return getLastSyncTime(REWARDS_ENTITY_NAME);
};

export const setLastSyncTimeForRewards = (timestamp: string): Promise<void> => {
  return setLastSyncTime(REWARDS_ENTITY_NAME, timestamp);
};
