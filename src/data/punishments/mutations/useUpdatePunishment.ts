
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';

// Local type to ensure 'id' is present for the generic hook's TItem constraint
type PunishmentWithId = PunishmentData & { id: string };

export type UpdatePunishmentVariables = { id: string } & Partial<Omit<PunishmentData, 'id'>>;

export const useUpdatePunishment = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<PunishmentWithId, Error, UpdatePunishmentVariables>({
    queryClient,
    queryKey: ['punishments'],
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
      return data as PunishmentWithId; // Cast to ensure 'id' is seen as non-optional
    },
    entityName: 'Punishment',
    idField: 'id', // idField refers to the key name, 'id'
  });
};
