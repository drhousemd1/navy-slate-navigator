import { Reward } from '@/lib/rewardUtils';
import { QueryObserverResult } from '@tanstack/react-query';

export interface RewardsContextType {
  rewards: Reward[];
  totalPoints: number;
  totalRewardsSupply: number;
  domPoints: number; // Add this new property
  setTotalPoints: (points: number) => Promise<void>;
  isLoading: boolean;
  refetchRewards: () => Promise<QueryObserverResult<Reward[], Error>>;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<string | null>;
  handleDeleteReward: (index: number) => Promise<boolean>;
  handleBuyReward: (id: string, cost: number) => Promise<void>;
  handleUseReward: (id: string) => Promise<void>;
  refreshPointsFromDatabase: () => Promise<void>;
}

export interface SaveRewardParams {
  rewardData: {
    id?: string;
    title: string;
    description: string;
    cost: number;
    image_url?: string | null;
    is_enabled?: boolean;
  };
  currentIndex: number | null;
}

export interface BuyRewardParams {
  rewardId: string;
  cost: number;
}
