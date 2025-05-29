
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { PUNISHMENTS_QUERY_KEY } from '@/data/punishments/queries';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';
import { useUserIds } from '@/contexts/UserIdsContext';

type PunishmentWithId = PunishmentData & { id: string };

export type CreatePunishmentVariables = Partial<Omit<PunishmentData, 'id' | 'created_at' | 'updated_at' | 'dom_supply' | 'user_id'>> & {
  title: string;
  points: number;
  dom_supply?: number;
};

export const useCreatePunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useCreateOptimisticMutation<PunishmentWithId, Error, CreatePunishmentVariables>({
    queryClient,
    queryKey: [...PUNISHMENTS_QUERY_KEY],
    mutationFn: async (variables: CreatePunishmentVariables) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      const dataToInsert = {
        ...variables,
        dom_supply: variables.dom_supply ?? 0,
        user_id: subUserId
      };
      
      const { data, error } = await supabase
        .from('punishments')
        .insert(dataToInsert)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Punishment creation failed.');
      return data as PunishmentWithId;
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
        dom_supply: variables.dom_supply ?? 0,
        user_id: subUserId!,
        ...variables,
      } as PunishmentWithId;
    },
    onSuccessCallback: async (_data: PunishmentWithId, _variables: CreatePunishmentVariables) => {
      const currentPunishments = queryClient.getQueryData<PunishmentWithId[]>([...PUNISHMENTS_QUERY_KEY]) || [];
      await savePunishmentsToDB(currentPunishments);
    },
  });
};
