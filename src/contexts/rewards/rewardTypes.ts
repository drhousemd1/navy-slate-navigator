
```typescript
import { Reward } from '@/data/rewards/types'; // Updated import
import { QueryObserverResult } from '@tanstack/react-query';

export interface SaveRewardParams {
  rewardData: any; // Consider making this Partial<Reward> & { title: string; ... required fields ... }
  currentIndex: number | null;
}

export interface BuyRewardParams {
  rewardId: string;
  cost: number;
  isDomReward?: boolean;
}

export interface RewardsContextType {
  rewards: Reward[];
  totalPoints: number;
  totalRewardsSupply: number;
  totalDomRewardsSupply: number;
  domPoints: number;
  setTotalPoints: (points: number) => Promise<void>;
  setDomPoints: (points: number) => Promise<void>;
  isLoading: boolean;
  refetchRewards: () => Promise<QueryObserverResult<Reward[], Error>>;
  handleSaveReward: (rewardData: Partial<Reward>, index: number | null) => Promise<string | null>;
  handleDeleteReward: (index: number) => Promise<boolean>;
  handleBuyReward: (id: string, cost: number, isDomReward?: boolean) => Promise<void>;
  handleUseReward: (id: string) => Promise<void>;
  refreshPointsFromDatabase: () => Promise<void>;
}
```
