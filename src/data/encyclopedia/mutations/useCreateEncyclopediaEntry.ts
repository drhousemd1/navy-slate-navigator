
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia'; // Assuming type is exported
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';

export type CreateEncyclopediaEntryVariables = Partial<Omit<EncyclopediaEntry, 'id' | 'created_at' | 'updated_at'>> & {
  title: string;
  subtext: string;
  // Add other non-optional fields from EncyclopediaEntry if not already covered
};

export const useCreateEncyclopediaEntry = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<EncyclopediaEntry, Error, CreateEncyclopediaEntryVariables>({
    queryClient,
    queryKey: ['encyclopedia_entries'],
    mutationFn: async (variables: CreateEncyclopediaEntryVariables) => {
      const { data, error } = await supabase
        .from('encyclopedia_entries')
        .insert({ ...variables })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Encyclopedia entry creation failed, no data returned.');
      return data as EncyclopediaEntry;
    },
    entityName: 'Encyclopedia Entry',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        // Defaults from schema
        formatted_sections: [],
        popup_opacity: 100,
        title_color: '#FFFFFF',
        subtext_color: '#D1D5DB',
        focal_point_y: 50,
        focal_point_x: 50,
        opacity: 100,
        highlight_effect: false,
        popup_text_formatting: { isBold: false, fontSize: "1rem", isUnderlined: false },
        ...variables,
      } as EncyclopediaEntry;
    },
  });
};
