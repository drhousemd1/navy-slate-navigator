import { legacyQueryKey, captureCacheToken, type CacheToken } from '@/data/indexedDB/useIndexedDB';

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { savePunishmentsToDB, savePunishmentHistoryToDB } from '@/data/indexedDB/useIndexedDB';
import { useUserIds } from '@/contexts/UserIdsContext';

type PunishmentWithId = PunishmentData & { id: string };

export const useDeletePunishment = () => {
  const cacheToken = captureCacheToken();
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const punishmentsQueryKey = legacyQueryKey(PUNISHMENTS_QUERY_KEY, cacheToken);
  const historyQueryKey = legacyQueryKey(PUNISHMENT_HISTORY_QUERY_KEY, cacheToken);

  return useDeleteOptimisticMutation<PunishmentWithId, Error, string>({
    cacheToken,
    queryClient,
    queryKey: punishmentsQueryKey,
    mutationFn: async (punishmentId: string) => {
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
    },
    entityName: 'Punishment',
    idField: 'id',
    relatedQueryKey: historyQueryKey,
    relatedIdField: 'punishment_id',
    onSuccessCallback: async (punishmentId: string, cacheToken) => {
      // Get current data from cache and remove the deleted item
      const currentPunishments = queryClient.getQueryData<PunishmentWithId[]>(punishmentsQueryKey) || [];
      const updatedPunishments = currentPunishments.filter(p => p.id !== punishmentId);

      // Update IndexedDB with the filtered list to ensure deleted item is removed
      await savePunishmentsToDB(updatedPunishments, cacheToken);

      // Also clean up history from IndexedDB
      const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(historyQueryKey) || [];
      const updatedHistory = currentHistory.filter(h => h.punishment_id !== punishmentId);
      await savePunishmentHistoryToDB(updatedHistory, cacheToken);
    } });
};
