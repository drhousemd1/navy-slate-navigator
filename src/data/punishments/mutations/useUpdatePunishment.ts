
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { PUNISHMENTS_QUERY_KEY } from '@/data/punishments/queries';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';
import { processImageForSave } from '@/utils/image/punishmentIntegration';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';

type PunishmentWithId = PunishmentData & { id: string };

export type UpdatePunishmentVariables = { id: string } & Partial<Omit<PunishmentData, 'id'>>;

export const useUpdatePunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const punishmentsQueryKey = [...PUNISHMENTS_QUERY_KEY, subUserId, domUserId];

  return useUpdateOptimisticMutation<PunishmentWithId, Error, UpdatePunishmentVariables>({
    queryClient,
    queryKey: punishmentsQueryKey,
    mutationFn: async (variables: UpdatePunishmentVariables) => {
      const { id, ...updates } = variables;
      
      // Process image if present
      const { processedUrl, metadata } = await processImageForSave(updates.background_image_url || null);
      
      const updatesWithImage = {
        ...updates,
        background_image_url: processedUrl,
        image_meta: updates.image_meta || metadata,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('punishments')
        .update(updatesWithImage)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Punishment update failed.');
      
      logger.debug('[Update Punishment] Punishment updated successfully with image compression');
      return data as PunishmentWithId;
    },
    entityName: 'Punishment',
    idField: 'id',
    onSuccessCallback: async (_data: PunishmentWithId, _variables: UpdatePunishmentVariables) => {
      const currentPunishments = queryClient.getQueryData<PunishmentWithId[]>(punishmentsQueryKey) || [];
      await savePunishmentsToDB(currentPunishments);
    },
  });
};
