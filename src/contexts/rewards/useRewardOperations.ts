
import { useCallback, useContext } from 'react';
import { useRewards as useRewardsQuery } from '@/data/queries/useRewards';
import { useBuySubReward } from '@/data/rewards/mutations/useBuySubReward';
import { useBuyDomReward } from '@/data/rewards/mutations/useBuyDomReward';
import { useRedeemSubReward } from '@/data/rewards/mutations/useRedeemSubReward';
import { useRedeemDomReward } from '@/data/rewards/mutations/useRedeemDomReward';
import { Reward } from '@/data/rewards/types';
import { useUserIds } from '@/contexts/UserIdsContext';
import { usePoints } from '@/data/points/useUserPointsQuery';
import { useDomPoints } from '@/data/points/useUserDomPointsQuery';
import { useRewards } from '@/contexts/RewardsContext';

export const useRewardOperations = () => {
  const { data: rewards = [] } = useRewardsQuery();
  const { subUserId, domUserId } = useUserIds();
  const { data: points = 0 } = usePoints(subUserId);
  const { data: domPoints = 0 } = useDomPoints(domUserId);
  const buySubRewardMutation = useBuySubReward();
  const buyDomRewardMutation = useBuyDomReward();
  const redeemSubRewardMutation = useRedeemSubReward();
  const redeemDomRewardMutation = useRedeemDomReward();

  const buyDomReward = useCallback(async (rewardId: string, cost: number) => {
    if (!domUserId) {
      throw new Error("User not authenticated");
    }

    const currentReward = rewards.find(r => r.id === rewardId);
    if (!currentReward) {
      throw new Error("Reward not found");
    }

    if (domPoints < cost) {
      throw new Error("Not enough DOM points to purchase this reward.");
    }

    await buyDomRewardMutation.mutateAsync({
      rewardId,
      cost,
      currentSupply: currentReward.supply,
      currentDomPoints: domPoints
    });
  }, [domUserId, rewards, domPoints, buyDomRewardMutation]);

  const buySubReward = useCallback(async (rewardId: string, cost: number) => {
    if (!subUserId) {
      throw new Error("User not authenticated");
    }

    const currentReward = rewards.find(r => r.id === rewardId);
    if (!currentReward) {
      throw new Error("Reward not found");
    }

    if (points < cost) {
      throw new Error("Not enough points to purchase this reward.");
    }

    await buySubRewardMutation.mutateAsync({
      rewardId,
      cost,
      currentSupply: currentReward.supply,
      currentPoints: points
    });
  }, [subUserId, rewards, points, buySubRewardMutation]);

  const handleUseReward = useCallback(async (rewardId: string) => {
    const rewardToUse = rewards.find((reward) => reward.id === rewardId);

    if (!rewardToUse) {
      throw new Error('Reward not found');
    }

    if (rewardToUse.is_dom_reward) {
      if (!domUserId) {
        throw new Error('DOM User not authenticated');
      }
      await redeemDomRewardMutation.mutateAsync({ rewardId: rewardToUse.id, currentSupply: rewardToUse.supply, profileId: domUserId });
    } else {
      if (!subUserId) {
        throw new Error('SUB User not authenticated');
      }
      await redeemSubRewardMutation.mutateAsync({ rewardId: rewardToUse.id, currentSupply: rewardToUse.supply, profileId: subUserId });
    }
  }, [rewards, subUserId, domUserId, redeemSubRewardMutation, redeemDomRewardMutation]);

  const refreshRewards = useCallback(async (newRewards: Reward[]) => {
    // This function is no longer needed since we're using the main context
    console.log('refreshRewards called but using main context now');
  }, []);

  return {
    buyDomReward,
    buySubReward,
    handleUseReward,
    refreshRewards,
  };
};
