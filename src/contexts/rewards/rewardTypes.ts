
import { Reward } from '@/lib/rewardUtils';
import { QueryObserverResult } from '@tanstack/react-query';

export interface RewardsContextType {
  rewards: Reward[];
  totalPoints: number;
  totalRewardsSupply: number;
  domPoints: number;
  setTotalPoints: (points: number) => Promise<void>;
  setDomPoints: (points: number) => Promise<void>;
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
    is_dom_reward?: boolean; // Added this field
  };
  currentIndex: number | null;
}

export interface BuyRewardParams {
  rewardId: string;
  cost: number;
  isDomReward?: boolean; // Added this field
}
