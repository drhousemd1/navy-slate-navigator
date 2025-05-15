
import { queryClient } from '../queryClient';
import { loadPunishmentsFromDB } from '../indexedDB/useIndexedDB';
import { PunishmentData } from '@/contexts/punishments/types';

export const usePreloadPunishments = () => {
  return async () => {
    try {
      // Check if data already exists in cache
      const existingData = queryClient.getQueryData(['punishments']);
      
      if (!existingData) {
        // Try to load from IndexedDB
        const localData = await loadPunishmentsFromDB();
        
        if (localData && localData.length > 0) {
          // Set the data in the query cache
          queryClient.setQueryData(['punishments'], localData);
          console.log('[Preload] Loaded punishments from IndexedDB:', localData.length);
        }
      }
    } catch (error) {
      console.error('[Preload] Error preloading punishments:', error);
    }
  };
};
