
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { toastManager } from '@/lib/toastManager';
import { logger } from '@/lib/logger';
import { getMondayBasedDay } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { usePartnerHelper } from '@/hooks/usePartnerHelper';

interface OptimisticApplyContext {
  previousHistoryData?: PunishmentHistoryItem[];
  optimisticId?: string;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  const { getPartnerId } = usePartnerHelper();

  const historyQueryKey = [...PUNISHMENT_HISTORY_QUERY_KEY, subUserId, domUserId];

  return useMutation<PunishmentHistoryItem, Error, ApplyPunishmentArgs, OptimisticApplyContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      logger.debug('[useApplyPunishment] Applying punishment with args:', args);
      
      const historyEntryData = {
        punishment_id: args.punishmentId,
        points_deducted: args.pointsDeducted,
        day_of_week: args.dayOfWeek ?? getMondayBasedDay(),
        user_id: subUserId,
        applied_date: new Date().toISOString()
      };

      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .insert(historyEntryData)
        .select()
        .single();

      if (historyError) {
        logger.error('[useApplyPunishment] History insert error:', historyError);
        throw historyError;
      }

      if (!historyData) {
        throw new Error('Failed to create punishment history entry');
      }

      // Update submissive points
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ 
          points: Math.max(0, (args.currentPoints || 0) - args.pointsDeducted)
        })
        .eq('id', subUserId);

      if (pointsError) {
        logger.error('[useApplyPunishment] Points update error:', pointsError);
        throw pointsError;
      }

      // Award DOM points to the dominant partner if they exist and DOM points > 0
      if (domUserId && args.domPointsAwarded > 0) {
        // Get current DOM points
        const { data: domProfile, error: domProfileError } = await supabase
          .from('profiles')
          .select('dom_points')
          .eq('id', domUserId)
          .single();

        if (domProfileError) {
          logger.error('[useApplyPunishment] DOM profile fetch error:', domProfileError);
          throw domProfileError;
        }

        // Update DOM points
        const currentDomPoints = domProfile?.dom_points || 0;
        const { error: domPointsError } = await supabase
          .from('profiles')
          .update({ 
            dom_points: currentDomPoints + args.domPointsAwarded
          })
          .eq('id', domUserId);

        if (domPointsError) {
          logger.error('[useApplyPunishment] DOM points update error:', domPointsError);
          throw domPointsError;
        }

        logger.debug(`[useApplyPunishment] Awarded ${args.domPointsAwarded} DOM points to ${domUserId}`);
      }

      logger.debug('[useApplyPunishment] Successfully applied punishment');
      return historyData as PunishmentHistoryItem;
    },
    onMutate: async (args: ApplyPunishmentArgs) => {
      await queryClient.cancelQueries({ queryKey: historyQueryKey });
      const previousHistoryData = queryClient.getQueryData<PunishmentHistoryItem[]>(historyQueryKey);
      
      const optimisticId = uuidv4();
      const optimisticEntry: PunishmentHistoryItem = {
        id: optimisticId,
        punishment_id: args.punishmentId,
        points_deducted: args.pointsDeducted,
        day_of_week: args.dayOfWeek ?? getMondayBasedDay(),
        user_id: subUserId!,
        applied_date: new Date().toISOString()
      };

      queryClient.setQueryData<PunishmentHistoryItem[]>(historyQueryKey, (old = []) => [optimisticEntry, ...old]);
      
      return { previousHistoryData, optimisticId };
    },
    onSuccess: async (data, variables, context) => {
      queryClient.setQueryData<PunishmentHistoryItem[]>(historyQueryKey, (old = []) => {
        const filteredList = old.filter(item => !(context?.optimisticId && item.id === context.optimisticId));
        return [data, ...filteredList];
      });
      
      
      // Invalidate both submissive and dominant points caches
      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
      if (domUserId) {
        queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] });
      }
      
      toastManager.success("Punishment Applied", "Punishment has been successfully applied.");
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousHistoryData) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(historyQueryKey, context.previousHistoryData);
      }
      
      logger.error('[useApplyPunishment] Mutation error:', error);
      toastManager.error("Failed to Apply Punishment", error.message);
    },
    onSettled: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      queryClient.invalidateQueries({ queryKey: historyQueryKey });
    },
  });
};
