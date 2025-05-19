
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { savePunishmentsToDB, savePunishmentHistoryToDB } from '@/data/indexedDB/useIndexedDB';

type PunishmentWithId = PunishmentData & { id: string };

export const useDeletePunishment = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<PunishmentWithId, Error, string>({
    queryClient,
    queryKey: [...PUNISHMENTS_QUERY_KEY],
    mutationFn: async (punishmentId: string) => {
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
    },
    entityName: 'Punishment',
    idField: 'id',
    relatedQueryKey: [...PUNISHMENT_HISTORY_QUERY_KEY],
    relatedIdField: 'punishment_id',
    onSuccessCallback: async (_punishmentId: string) => {
      const currentPunishments = queryClient.getQueryData<PunishmentWithId[]>([...PUNISHMENTS_QUERY_KEY]) || [];
      await savePunishmentsToDB(currentPunishments);
      const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>([...PUNISHMENT_HISTORY_QUERY_KEY]) || [];
      await savePunishmentHistoryToDB(currentHistory);
    },
  });
};

