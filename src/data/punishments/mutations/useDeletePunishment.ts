
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { savePunishmentsToDB, savePunishmentHistoryToDB } from '@/data/indexedDB/useIndexedDB';
import { useUserIds } from '@/contexts/UserIdsContext';

type PunishmentWithId = PunishmentData & { id: string };

export const useDeletePunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const punishmentsQueryKey = [...PUNISHMENTS_QUERY_KEY, subUserId, domUserId];
  const historyQueryKey = [...PUNISHMENT_HISTORY_QUERY_KEY, subUserId, domUserId];

  return useDeleteOptimisticMutation<PunishmentWithId, Error, string>({
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
    onSuccessCallback: async (_punishmentId: string) => {
      const currentPunishments = queryClient.getQueryData<PunishmentWithId[]>(punishmentsQueryKey) || [];
      await savePunishmentsToDB(currentPunishments);
      const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(historyQueryKey) || [];
      await savePunishmentHistoryToDB(currentHistory);
    },
  });
};
