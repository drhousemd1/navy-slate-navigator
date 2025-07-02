
import { useRewards } from '@/contexts/RewardsContext';

export const usePointsBubbleData = () => {
  const { rewards, totalPoints, domPoints } = useRewards();

  // Calculate reward type counts from existing rewards data
  const subRewardTypesCount = rewards.reduce((total, reward) => {
    return total + (!reward.is_dom_reward && reward.supply > 0 ? reward.supply : 0);
  }, 0);

  const domRewardTypesCount = rewards.reduce((total, reward) => {
    return total + (reward.is_dom_reward && reward.supply > 0 ? reward.supply : 0);
  }, 0);

  return {
    subPoints: totalPoints ?? 0,
    domPoints: domPoints ?? 0,
    subRewardTypesCount,
    domRewardTypesCount,
  };
};
