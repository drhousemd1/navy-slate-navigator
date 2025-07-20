import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { WellbeingSnapshot, CreateWellbeingData } from '../types';
import { WELLBEING_QUERY_KEY, WEEKLY_WELLBEING_QUERY_KEY, MONTHLY_WELLBEING_QUERY_KEY } from '../queries';
import { loadWellbeingFromDB, saveWellbeingToDB, setLastSyncTimeForWellbeing } from '@/data/indexedDB/useIndexedDB';
import { toastManager } from '@/lib/toastManager';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { usePartnerHelper } from '@/hooks/usePartnerHelper';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const useUpsertWellbeing = (userId: string | null) => {
  const queryClient = useQueryClient();
  const { getPartnerId } = usePartnerHelper();
  const { queueWellnessUpdatedNotification } = usePushNotifications();

  return useMutation<WellbeingSnapshot, Error, CreateWellbeingData>({
    mutationFn: async (variables: CreateWellbeingData) => {
      if (!userId) {
        throw new Error('User ID is required to save wellbeing data');
      }

      logger.debug('[useUpsertWellbeing] Upserting wellbeing data:', variables);

      // First, try to get existing snapshot
      const { data: existingData } = await supabase
        .from('wellbeing_snapshots')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let result;

      if (existingData) {
        // Update existing snapshot
        const { data, error } = await supabase
          .from('wellbeing_snapshots')
          .update({
            metrics: variables.metrics as any,
            overall_score: variables.overall_score,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new snapshot
        const { data, error } = await supabase
          .from('wellbeing_snapshots')
          .insert({
            user_id: userId,
            metrics: variables.metrics as any,
            overall_score: variables.overall_score
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      if (!result) throw new Error('Wellbeing upsert failed: No data returned.');

      // Cast the result to our type
      return {
        ...result,
        metrics: result.metrics as Record<string, number>
      } as WellbeingSnapshot;
    },
    onSuccess: async (wellbeingData) => {
      logger.debug('[useUpsertWellbeing onSuccess] Wellbeing upserted, updating IndexedDB.', wellbeingData);
      try {
        await saveWellbeingToDB(wellbeingData, userId);
        await setLastSyncTimeForWellbeing(new Date().toISOString(), userId);
        logger.debug('[useUpsertWellbeing onSuccess] IndexedDB updated with wellbeing data.');
        
        // Update query cache
        queryClient.setQueryData([...WELLBEING_QUERY_KEY, userId], wellbeingData);
        
        // Invalidate weekly and monthly wellbeing chart queries to update throne room
        queryClient.invalidateQueries({ queryKey: WEEKLY_WELLBEING_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: MONTHLY_WELLBEING_QUERY_KEY });
        
        logger.debug('[useUpsertWellbeing onSuccess] Query cache updated and chart queries invalidated.');
        
        // Send push notification to partner about wellness update
        const partnerId = await getPartnerId();
        if (partnerId) {
          try {
            queueWellnessUpdatedNotification(partnerId, wellbeingData.overall_score);
          } catch (error) {
            logger.error('Failed to send wellness update notification:', error);
          }
        }
        
        toastManager.success("Wellbeing Updated", "Your wellbeing status has been saved.");
      } catch (e: unknown) {
        const descriptiveMessage = getErrorMessage(e);
        logger.error('[useUpsertWellbeing onSuccess] Error updating IndexedDB or cache:', descriptiveMessage, e);
        toastManager.error("Local Save Error", `Failed to save wellbeing data locally: ${descriptiveMessage}`);
      }
    },
    onError: (error) => {
      logger.error('[useUpsertWellbeing] Error saving wellbeing data:', error);
      toastManager.error("Save Failed", `Failed to save wellbeing data: ${getErrorMessage(error)}`);
    }
  });
};