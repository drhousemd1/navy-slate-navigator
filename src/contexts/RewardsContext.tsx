
import React, { createContext, useContext } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { useAtomicRewardsData } from '@/data/rewards/useAtomicRewardsData';
import { useActionCommands } from './ActionCommandsContext';
import type { Currency } from '@/domain/actions/types';
import { Reward } from '@/data/rewards/types';
import { QueryObserverResult } from '@tanstack/react-query';

const mockQueryResult: QueryObserverResult<Reward[], Error> = {
  data: [],
  error: null,
  isError: false as const,
  isSuccess: true as const,
  isLoading: false as const,
  isPending: false as const,
  isLoadingError: false as const,
  isRefetchError: false as const,
  failureCount: 0,
  failureReason: null,
  status: 'success' as const,
  fetchStatus: 'idle' as const,
  dataUpdatedAt: Date.now(),
  errorUpdatedAt: 0,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isPlaceholderData: false,
  isRefetching: false,
  isStale: false,
  errorUpdateCount: 0,
  isInitialLoading: false,
  isPaused: false,
  refetch: async () => mockQueryResult,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;


const RewardsContext = createContext<RewardsContextType>({
  atomicAccounting: false,
  handleGiftReward: async () => { throw new Error('Gifting is not available yet.'); },
  rewards: [],
  totalPoints: 0,
  totalRewardsSupply: 0,
  totalDomRewardsSupply: 0,
  domPoints: 0,
  setTotalPoints: async () => {},
  setDomPoints: async () => {},
  isLoading: true,
  refetchRewards: async () => mockQueryResult,
  handleSaveReward: async () => null,
  handleDeleteReward: async () => false,
  handleBuyReward: async () => {},
  handleUseReward: async () => {},
  refreshPointsFromDatabase: async () => {},
});

export const useRewards = () => useContext(RewardsContext);

export const RewardsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const actions = useActionCommands();
  if (actions.mode === 'atomic') return <AtomicRewardsProvider>{children}</AtomicRewardsProvider>;
  if (actions.mode === 'legacy') return <LegacyRewardsProvider>{children}</LegacyRewardsProvider>;
  return <>{children}</>;
};
function LegacyRewardsProvider({ children }: React.PropsWithChildren) {
  const data = useRewardsData();
  return <RewardDataProvider data={data}>{children}</RewardDataProvider>;
}
function AtomicRewardsProvider({ children }: React.PropsWithChildren) {
  const data = useAtomicRewardsData();
  return <RewardDataProvider data={data}>{children}</RewardDataProvider>;
}
function RewardDataProvider({ children, data }: React.PropsWithChildren<{ data: ReturnType<typeof useRewardsData> | ReturnType<typeof useAtomicRewardsData> }>) {
  const atomicAccounting = 'atomicAccounting' in data && data.atomicAccounting;
  const value: RewardsContextType = {
    rewards: data.rewards, totalPoints: data.totalPoints, domPoints: data.domPoints,
    totalRewardsSupply: data.totalRewardsSupply, totalDomRewardsSupply: data.totalDomRewardsSupply,
    atomicAccounting, isLoading: data.isLoading,
    setTotalPoints: data.updatePoints, setDomPoints: data.updateDomPoints,
    refetchRewards: data.refetchRewards, refreshPointsFromDatabase: data.refreshPointsFromDatabase,
    handleSaveReward: async (rewardData, currentIndex) => {
      const reward = await data.saveReward({ rewardData, currentIndex });
      await data.refetchRewards();
      return reward?.id ?? null;
    },
    handleDeleteReward: async index => {
      const reward = data.rewards[index];
      if (!reward) throw new Error('Reward not found. Reload before deleting.');
      await data.deleteReward(reward.id);
      // Atomic means durably queued, not already deleted. The page shows the
      // saved command and retains the card until a confirmed read removes it.
      return true;
    },
    handleBuyReward: async (id, cost, isDomReward) => {
      const reward = data.rewards.find(item => item.id === id);
      if (!reward) throw new Error('Reward not found. Reload before buying.');
      await data.buyReward({ rewardId: id, cost, isDomReward: isDomReward ?? reward.is_dom_reward });
    },
    handleUseReward: async (id, inventoryCurrency?: Currency) => { await data.useReward({ rewardId: id, inventoryCurrency }); },
    handleGiftReward: async id => {
      if (!('giftReward' in data)) throw new Error('Gifting will be available after this relationship’s accounting upgrade.');
      await data.giftReward(id);
    },
  };
  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}
