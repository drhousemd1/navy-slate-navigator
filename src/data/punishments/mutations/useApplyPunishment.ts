
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { useOptimisticMutation } from '@/lib/optimistic-mutations';
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

  return useOptimisticMutation<PunishmentHistoryItem, Error, ApplyPunishmentArgs, OptimisticApplyContext>({
    queryClient,
    mutationFn: async (args: ApplyPunishmentArgs) => {
      if (!subUserId || !domUserId) {
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

      // Update dominant partner's DOM points
      const { data: domProfile, error: domFetchError } = await supabase
        .from('profiles')
        .select('dom_points')
        .eq('id', domUserId)
        .single();

      if (domFetchError) {
        logger.error('[useApplyPunishment] DOM profile fetch error:', domFetchError);
        throw domFetchError;
      }

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
      
      // Invalidate both user points caches
      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
      queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousHistoryData) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(historyQueryKey, context.previousHistoryData);
      }
      
      logger.error('[useApplyPunishment] Mutation error:', error);
    },
    onSettled: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      queryClient.invalidateQueries({ queryKey: historyQueryKey });
    },
    entityName: 'Punishment',
    successMessage: 'Punishment has been successfully applied',
    errorMessage: 'Failed to apply punishment',
  });
};
