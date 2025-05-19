
import { db, LastSync } from './db';

export const getLastSyncTime = async (entityName: string): Promise<string | null> => {
  try {
    const syncTimeEntry = await db.lastSyncTimes.get(entityName);
    return syncTimeEntry ? syncTimeEntry.timestamp : null;
  } catch (error) {
    console.error(`Error getting last sync time for ${entityName}:`, error);
    return null;
  }
};

export const setLastSyncTime = async (entityName: string, timestamp: string): Promise<void> => {
  try {
    await db.lastSyncTimes.put({ id: entityName, timestamp });
  } catch (error) {
    console.error(`Error setting last sync time for ${entityName}:`, error);
  }
};
