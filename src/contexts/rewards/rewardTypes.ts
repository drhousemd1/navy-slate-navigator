
import { Reward } from '@/lib/rewardUtils';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';

export interface RewardsContextType {
  rewards: Reward[];
  totalPoints: number;
  totalRewardsSupply: number;
  setTotalPoints: (points: number) => void;
  isLoading: boolean;
  refetchRewards: (options?: RefetchOptions) => Promise<QueryObserverResult<Reward[], Error>>;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<Reward | null>;
  handleDeleteReward: (index: number) => Promise<boolean>;
  handleBuyReward: (id: string, cost: number) => Promise<void>;
  handleUseReward: (id: string) => Promise<void>;
  refreshPointsFromDatabase: () => Promise<void>;
}
