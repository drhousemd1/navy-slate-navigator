import { Reward } from '@/data/rewards/types';
import { currentWeekIdentifier } from './taskUtils';

export const calculateRewardSupplyPercentage = (reward: Reward): number => {
  if (reward.supply === -1) return 100;
  if (reward.supply === 0) return 0;
  return Math.min(100, Math.max(0, (reward.supply / 10) * 100));
};

export const formatRewardDescription = (description?: string | null): string => {
  if (!description) return '';
  return description.length > 100 ? `${description.substring(0, 100)}...` : description;
};

export const getCurrentWeekRewards = (rewards: Reward[]): Reward[] => {
  const currentWeek = currentWeekIdentifier();
  return rewards.filter(reward => {
    // For rewards, we might want to show all available rewards regardless of week
    // This can be customized based on business logic
    return true;
  });
};

export const getRewardsByType = (rewards: Reward[], isDomReward: boolean): Reward[] => {
  return rewards.filter(reward => reward.is_dom_reward === isDomReward);
};
