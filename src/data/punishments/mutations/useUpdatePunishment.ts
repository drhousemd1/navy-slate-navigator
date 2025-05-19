
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { PUNISHMENTS_QUERY_KEY } from '@/data/punishments/queries';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';

type PunishmentWithId = PunishmentData & { id: string };

export type UpdatePunishmentVariables = { id: string } & Partial<Omit<PunishmentData, 'id'>>;

export const useUpdatePunishment = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<PunishmentWithId, Error, UpdatePunishmentVariables>({
    queryClient,
    queryKey: [...PUNISHMENTS_QUERY_KEY],
    mutationFn: async (variables: UpdatePunishmentVariables) => {
      const { id, ...updates } = variables;
      const { data, error } = await supabase
        .from('punishments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Punishment update failed.');
      return data as PunishmentWithId;
    },
    entityName: 'Punishment',
    idField: 'id',
    onSuccessCallback: async (_data: PunishmentWithId, _variables: UpdatePunishmentVariables) => {
      const currentPunishments = queryClient.getQueryData<PunishmentWithId[]>([...PUNISHMENTS_QUERY_KEY]) || [];
      await savePunishmentsToDB(currentPunishments);
    },
  });
};

