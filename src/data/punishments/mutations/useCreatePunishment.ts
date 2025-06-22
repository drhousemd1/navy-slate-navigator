
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { PUNISHMENTS_QUERY_KEY } from '@/data/punishments/queries';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';
import { useUserIds } from '@/contexts/UserIdsContext';
import { processImageForSave } from '@/utils/image/punishmentIntegration';
import { logger } from '@/lib/logger';

type PunishmentWithId = PunishmentData & { id: string };

export type CreatePunishmentVariables = Partial<Omit<PunishmentData, 'id' | 'created_at' | 'updated_at' | 'dom_supply' | 'user_id'>> & {
  title: string;
  points: number;
  dom_supply?: number;
};

export const useCreatePunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const punishmentsQueryKey = [...PUNISHMENTS_QUERY_KEY, subUserId, domUserId];

  return useCreateOptimisticMutation<PunishmentWithId, Error, CreatePunishmentVariables>({
    queryClient,
    queryKey: punishmentsQueryKey,
    mutationFn: async (variables: CreatePunishmentVariables) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      // Process image if present
      const { processedUrl, metadata } = await processImageForSave(variables.background_image_url || null);

      const dataToInsert = {
        ...variables,
        background_image_url: processedUrl,
        image_meta: variables.image_meta || metadata,
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
      
      logger.debug('[Create Punishment] Punishment created successfully with image compression');
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
      const currentPunishments = queryClient.getQueryData<PunishmentWithId[]>(punishmentsQueryKey) || [];
      await savePunishmentsToDB(currentPunishments);
    },
  });
};
