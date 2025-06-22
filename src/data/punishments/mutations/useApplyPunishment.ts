
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { toastManager } from '@/lib/toastManager';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

interface OptimisticApplyContext {
  previousHistoryData?: PunishmentHistoryItem[];
  optimisticId?: string;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

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
        day_of_week: args.dayOfWeek ?? new Date().getDay(),
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
        day_of_week: args.dayOfWeek ?? new Date().getDay(),
        user_id: subUserId!,
        applied_date: new Date().toISOString()
      };

      queryClient.setQueryData<PunishmentHistoryItem[]>(historyQueryKey, (old = []) => [optimisticEntry, ...old]);
      
      return { previousHistoryData, optimisticId };
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData<PunishmentHistoryItem[]>(historyQueryKey, (old = []) => {
        const filteredList = old.filter(item => !(context?.optimisticId && item.id === context.optimisticId));
        return [data, ...filteredList];
      });
      
      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
      
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
