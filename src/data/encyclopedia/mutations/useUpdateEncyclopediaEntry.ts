
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';

// Assuming FormattedSection is the type for elements in EncyclopediaEntry.formatted_sections
type FormattedSection = NonNullable<EncyclopediaEntry['formatted_sections']>[number];

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
        .update({ ...updates, updated_at: new Date().toISOString() }) // Assumes updates are shaped correctly
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Encyclopedia entry update failed, no data returned.');
      // Explicitly cast formatted_sections if it's too generic from Supabase
      return {
        ...data,
        formatted_sections: (data.formatted_sections as unknown as FormattedSection[]) || [],
      } as EncyclopediaEntry;
    },
    entityName: 'Encyclopedia Entry',
    idField: 'id',
  });
};
