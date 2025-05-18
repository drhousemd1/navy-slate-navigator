
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';

export type UpdateEncyclopediaEntryVariables = { id: string } & Partial<Omit<EncyclopediaEntry, 'id'>>;

export const useUpdateEncyclopediaEntry = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<EncyclopediaEntry, Error, UpdateEncyclopediaEntryVariables>({
    queryClient,
    queryKey: ['encyclopedia_entries'],
    mutationFn: async (variables: UpdateEncyclopediaEntryVariables) => {
      const { id, ...updates } = variables;
      const { data, error } = await supabase
        .from('encyclopedia_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Encyclopedia entry update failed, no data returned.');
      return data as EncyclopediaEntry;
    },
    entityName: 'Encyclopedia Entry',
    idField: 'id',
  });
};
