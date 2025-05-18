
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';

export type CreatePunishmentVariables = Partial<Omit<PunishmentData, 'id' | 'created_at' | 'updated_at'>> & {
  title: string;
  points: number;
};

export const useCreatePunishment = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<PunishmentData, Error, CreatePunishmentVariables>({
    queryClient,
    queryKey: ['punishments'],
    mutationFn: async (variables: CreatePunishmentVariables) => {
      const { data, error } = await supabase
        .from('punishments')
        .insert({ ...variables }) // Ensure all necessary fields are passed
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Punishment creation failed.');
      return data as PunishmentData;
    },
    entityName: 'Punishment',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        icon_name: variables.icon_name || 'ShieldAlert',
        icon_color: variables.icon_color || '#ea384c',
        background_image_url: variables.background_image_url || undefined,
        background_opacity: variables.background_opacity || 50,
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#ea384c',
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x || 50,
        focal_point_y: variables.focal_point_y || 50,
        ...variables,
      } as PunishmentData;
    },
  });
};
