
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';

// Local type to ensure 'id' is present for the generic hook's TItem constraint
type PunishmentWithId = PunishmentData & { id: string };

// Define the variables directly here without relying on imported type
export type CreatePunishmentVariables = {
  title: string;
  points: number;
  dom_supply?: number; // Make dom_supply optional here, will default if not provided
  user_id?: string; // Add user_id explicitly as it's needed
  // Allow other PunishmentData fields as optional
  description?: string | null;
  icon_name?: string | null;
  icon_color?: string;
  background_image_url?: string | null;
  background_opacity?: number;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  focal_point_x?: number;
  focal_point_y?: number;
};

export const useCreatePunishment = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<PunishmentWithId, Error, CreatePunishmentVariables>({
    queryClient,
    queryKey: ['punishments'],
    mutationFn: async (variables: CreatePunishmentVariables) => {
      const dataToInsert = {
        ...variables,
        dom_supply: variables.dom_supply ?? 0, // Default to 0 if not provided
      };
      const { data, error } = await supabase
        .from('punishments')
        .insert(dataToInsert) 
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Punishment creation failed.');
      return data as PunishmentWithId; // Cast to ensure 'id' is seen as non-optional
    },
    entityName: 'Punishment',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId, // Now satisfies PunishmentWithId
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
        dom_supply: variables.dom_supply ?? 0, // Default dom_supply for optimistic item
        ...variables, // title and points are required by CreatePunishmentVariables
      } as PunishmentWithId; // Cast to ensure 'id' is seen as non-optional
    },
  });
};
