
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation<PunishmentHistoryItem, Error, ApplyPunishmentArgs>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      logger.debug('[useApplyPunishment] Applying punishment with args:', args);
      
      // Create the history entry data
      const historyEntryData = {
        punishment_id: args.punishmentId,
        points_deducted: args.pointsDeducted,
        day_of_week: args.dayOfWeek ?? new Date().getDay(),
        user_id: subUserId,
        applied_date: new Date().toISOString()
      };

      // Insert the punishment history record
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

      // Update user points
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ 
          points: Math.max(0, (args.currentPoints || 0) - args.pointsDeducted)
        })
        .eq('id', subUserId);

      if (pointsError) {
        logger.error('[useApplyPunishment] Points update error:', pointsError);
        // Note: In production, you might want to implement a rollback mechanism here
        throw pointsError;
      }

      logger.debug('[useApplyPunishment] Successfully applied punishment');
      return historyData as PunishmentHistoryItem;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
      
      toast({
        title: "Punishment Applied",
        description: "Punishment has been successfully applied.",
      });
    },
    onError: (error: Error) => {
      logger.error('[useApplyPunishment] Mutation error:', error);
      toast({
        title: "Failed to Apply Punishment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
