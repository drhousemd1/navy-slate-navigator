
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { logger } from '@/lib/logger';

export const useDeleteEncyclopediaEntry = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<EncyclopediaEntry, Error, string>({
    queryClient,
    queryKey: ['encyclopedia-entries'], // Updated to match the new query key
    mutationFn: async (entryId: string) => {
      logger.debug('Deleting encyclopedia entry:', entryId);
      
      const { error } = await supabase
        .from('encyclopedia_entries')
        .delete()
        .eq('id', entryId);
        
      if (error) {
        logger.error('Error deleting encyclopedia entry:', error);
        throw error;
      }
      
      logger.debug('Successfully deleted encyclopedia entry:', entryId);
    },
    entityName: 'Encyclopedia Entry',
    idField: 'id',
  });
};
