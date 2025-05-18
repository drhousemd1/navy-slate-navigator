
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';

export const useDeletePunishment = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<PunishmentData, Error, string>({
    queryClient,
    queryKey: ['punishments'],
    mutationFn: async (punishmentId: string) => {
      // Also consider deleting related punishment_history entries if necessary,
      // or handle via DB cascade or separate relatedQueryKey logic in generic hook.
      // For now, just deleting the punishment itself.
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
    },
    entityName: 'Punishment',
    idField: 'id',
    // Example for related data: If deleting a punishment should also clear its history from another cache query
    // relatedQueryKey: ['allPunishmentHistory'], 
    // relatedIdField: 'punishment_id', // Assuming history items have 'punishment_id'
  });
};
