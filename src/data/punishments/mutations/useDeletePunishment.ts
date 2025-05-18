
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types'; // Original type
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';

// Local type to ensure 'id' is present for the generic hook's TItem constraint
// This TItem is for the items in the cache, not necessarily what mutationFn returns
type PunishmentWithId = PunishmentData & { id: string };

export const useDeletePunishment = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<PunishmentWithId, Error, string>({
    queryClient,
    queryKey: ['punishments'],
    mutationFn: async (punishmentId: string) => {
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
    },
    entityName: 'Punishment',
    idField: 'id', // idField refers to the key name, 'id'
    relatedQueryKey: ['allPunishmentHistory'], 
    relatedIdField: 'punishment_id', 
  });
};
