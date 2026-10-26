
import { useRewards } from '@/contexts/RewardsContext';

export const usePointsBubbleData = () => {
  const { rewards, totalPoints, domPoints, atomicAccounting, totalRewardsSupply, totalDomRewardsSupply, isLoading } = useRewards();

  // Calculate reward type counts from existing rewards data
  const subRewardTypesCount = rewards.reduce((total, reward) => {
    return total + (!reward.is_dom_reward && reward.supply > 0 ? reward.supply : 0);
  }, 0);

  const domRewardTypesCount = rewards.reduce((total, reward) => {
    return total + (reward.is_dom_reward && reward.supply > 0 ? reward.supply : 0);
  }, 0);

  return {
    isLoading,
    subPoints: totalPoints ?? 0,
    domPoints: domPoints ?? 0,
    subRewardTypesCount: atomicAccounting ? totalRewardsSupply : subRewardTypesCount,
    domRewardTypesCount: atomicAccounting ? totalDomRewardsSupply : domRewardTypesCount,
  };
};
