
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';

export const useDeleteEncyclopediaEntry = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<EncyclopediaEntry, Error, string>({
    queryClient,
    queryKey: ['encyclopedia_entries'],
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('encyclopedia_entries').delete().eq('id', entryId);
      if (error) throw error;
    },
    entityName: 'Encyclopedia Entry',
    idField: 'id',
  });
};
