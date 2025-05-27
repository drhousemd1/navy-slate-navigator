import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Reward, CreateRewardVariables, UpdateRewardVariables } from '@/data/rewards/types';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Query keys used by useUserPointsQuery and useUserDomPointsQuery
const USER_POINTS_QUERY_KEY_BASE = 'userPoints';
const USER_DOM_POINTS_QUERY_KEY_BASE = 'user-dom-points';


export function useRewardOperations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const invalidateUserPoints = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_BASE, user.id] });
      queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_BASE, user.id] });
      logger.debug('User points and DOM points queries invalidated and refresh triggered if available.');
    }
  }, [queryClient, user?.id]);

  const recordRewardUsage = useCallback(async (rewardId: string, userId: string, cost: number, isDomReward?: boolean) => {
    try {
      const { error } = await supabase
        .from('reward_usage')
        .insert({
          reward_id: rewardId,
          user_id: userId,
          points_spent: cost,
          is_dom_reward: !!isDomReward,
        });
      if (error) throw error;
      logger.debug(`Reward usage recorded for reward ${rewardId}, user ${userId}`);
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      toast({
        title: 'Error Recording Reward Usage',
        description: message,
        variant: 'destructive',
      });
      logger.error('Failed to record reward usage:', message, e);
      throw e; // Re-throw to be caught by caller
    }
  }, [toast]);

  const buyReward = useCallback(async (reward: Reward) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to buy rewards.', variant: 'destructive' });
      return;
    }

    const pointsToDeduct = reward.cost;
    const currentPointsKey = reward.is_dom_reward ? 'dom_points' : 'points';

    try {
      // Fetch current points
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(currentPointsKey)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('User profile not found.');

      const currentPointsValue = profileData[currentPointsKey] as number || 0;

      if (currentPointsValue < pointsToDeduct) {
        toast({ title: 'Not Enough Points', description: `You need ${pointsToDeduct} ${reward.is_dom_reward ? 'DOM' : ''} points to buy this reward.`, variant: 'warning' });
        return;
      }

      // Deduct points
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [currentPointsKey]: currentPointsValue - pointsToDeduct })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await recordRewardUsage(reward.id, user.id, reward.cost, reward.is_dom_reward);
      
      invalidateUserPoints();

      toast({ title: 'Reward Purchased!', description: `${reward.title} has been added to your inventory.` });
      logger.info(`Reward ${reward.id} purchased by user ${user.id}`);

    } catch (e: unknown) {
      const message = getErrorMessage(e);
      toast({
        title: 'Purchase Failed',
        description: message,
        variant: 'destructive',
      });
      logger.error('Error buying reward:', message, e);
    }
  }, [user, toast, invalidateUserPoints, recordRewardUsage]);

  return { buyReward, recordRewardUsage, invalidateUserPoints };
}
