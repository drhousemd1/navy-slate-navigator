import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../auth';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { REWARDS_QUERY_KEY, USER_POINTS_QUERY_KEY, USER_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { Reward } from '@/data/rewards/types';
import { getErrorMessage } from '@/lib/errors';

export const useRewardOperations = () => {
  const { user, refreshPoints, refreshDomPoints } = useAuth();
  const queryClient = useQueryClient();

  const redeemReward = useCallback(async (reward: Reward) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to redeem rewards.",
        variant: "destructive",
      });
      return;
    }

    if (reward.cost > (user.user_metadata?.points || 0)) {
      toast({
        title: "Insufficient points",
        description: "You do not have enough points to redeem this reward.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistically update points
      const newPoints = (user.user_metadata?.points || 0) - reward.cost;
      await queryClient.cancelQueries({ queryKey: [USER_POINTS_QUERY_KEY, user.id] });
      queryClient.setQueryData([USER_POINTS_QUERY_KEY, user.id], newPoints);

      // Optimistically update supply if it's a limited reward
      if (reward.supply > 0) {
        await queryClient.cancelQueries({ queryKey: [REWARDS_QUERY_KEY] });
        queryClient.setQueryData([REWARDS_QUERY_KEY], (oldRewards: Reward[] | undefined) => {
          if (!oldRewards) return [];
          return oldRewards.map(r =>
            r.id === reward.id ? { ...r, supply: Math.max(0, r.supply - 1) } : r
          );
        });
      }

      // Insert into reward_usage_history
      const { data: usageData, error: usageError } = await supabase
        .from('reward_usage_history')
        .insert([{
          user_id: user.id,
          reward_id: reward.id,
          points_deducted: reward.cost,
        }])
        .select()
        .single();

      if (usageError) throw usageError;

      // Update user points in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Refresh points from the database to ensure consistency
      await refreshPoints();
      await refreshDomPoints();

      toast({
        title: "Reward Redeemed",
        description: `You have successfully redeemed ${reward.title}.`,
      });
    } catch (error: unknown) {
      logger.error("Error redeeming reward:", getErrorMessage(error), error);
      toast({
        title: "Redemption Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [queryClient, user, refreshPoints, supabase]);

  const undoRedeemReward = useCallback(async (reward: Reward, usageEntryId?: string) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to undo reward redemption.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistically update points
      const newPoints = (user.user_metadata?.points || 0) + reward.cost;
      await queryClient.cancelQueries({ queryKey: [USER_POINTS_QUERY_KEY, user.id] });
      queryClient.setQueryData([USER_POINTS_QUERY_KEY, user.id], newPoints);

      // Optimistically update supply if it's a limited reward
      if (reward.supply > 0) {
        await queryClient.cancelQueries({ queryKey: [REWARDS_QUERY_KEY] });
        queryClient.setQueryData([REWARDS_QUERY_KEY], (oldRewards: Reward[] | undefined) => {
          if (!oldRewards) return [];
          return oldRewards.map(r =>
            r.id === reward.id ? { ...r, supply: r.supply + 1 } : r
          );
        });
      }

      // Delete from reward_usage_history
      const { error: usageError } = await supabase
        .from('reward_usage_history')
        .delete()
        .eq('id', usageEntryId);

      if (usageError) throw usageError;

      // Update user points in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Refresh points from the database to ensure consistency
      await refreshPoints();
      await refreshDomPoints();

      toast({
        title: "Undo Successful",
        description: `You have successfully undone the redemption of ${reward.title}.`,
      });
    } catch (error: unknown) {
      logger.error("Error undoing reward redemption:", getErrorMessage(error), error);
      toast({
        title: "Undo Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [queryClient, user, refreshPoints, supabase]);

  return { redeemReward, undoRedeemReward };
};
