
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';

// Assuming FormattedSection is the type for elements in EncyclopediaEntry.formatted_sections
type FormattedSection = NonNullable<EncyclopediaEntry['formatted_sections']>[number];

export type CreateEncyclopediaEntryVariables = Partial<Omit<EncyclopediaEntry, 'id' | 'created_at' | 'updated_at'>> & {
  title: string;
  subtext: string;
  // Ensure formatted_sections here is compatible or omitted if purely default
  formatted_sections?: FormattedSection[]; 
};

export const useCreateEncyclopediaEntry = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<EncyclopediaEntry, Error, CreateEncyclopediaEntryVariables>({
    queryClient,
    queryKey: ['encyclopedia_entries'],
    mutationFn: async (variables: CreateEncyclopediaEntryVariables) => {
      const { data, error } = await supabase
        .from('encyclopedia_entries')
        .insert({ ...variables }) // Assumes variables are shaped correctly for DB insert
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Encyclopedia entry creation failed, no data returned.');
      // Explicitly cast formatted_sections if it's too generic from Supabase
      return {
        ...data,
        formatted_sections: (data.formatted_sections as unknown as FormattedSection[]) || [],
      } as EncyclopediaEntry;
    },
    entityName: 'Encyclopedia Entry',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      // Destructure to handle formatted_sections explicitly
      const { formatted_sections, ...restVariables } = variables;
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        // Default values from schema or common practice
        formatted_sections: formatted_sections || [], // Use provided or default to empty array
        popup_opacity: 100,
        title_color: '#FFFFFF',
        subtext_color: '#D1D5DB',
        focal_point_y: 50,
        focal_point_x: 50,
        opacity: 100,
        highlight_effect: false,
        popup_text_formatting: { isBold: false, fontSize: "1rem", isUnderlined: false },
        ...restVariables, // Spread remaining variables
      } as EncyclopediaEntry; // This cast implies the constructed object matches EncyclopediaEntry
    },
  });
};
