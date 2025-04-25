
import React, { createContext, useContext } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';

// Create a complete mock observer result that satisfies the QueryObserverResult type
const mockQueryResult = {
  data: [],
  error: null,
  isError: false,
  isSuccess: true,
  isLoading: false,
  isPending: false,
  isLoadingError: false,
  isRefetchError: false,
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
  isPreviousData: false,
  isRefetching: false,
  isStale: false,
  // Additional properties required by QueryObserverResult
  errorUpdateCount: 0,
  isInitialLoading: false,
  isPaused: false,
  // The refetch function is also a Promise<QueryObserverResult>
  refetch: async () => mockQueryResult
};

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  totalRewardsSupply: 0,
  setTotalPoints: () => {},
  isLoading: true,
  refetchRewards: async () => mockQueryResult,
  handleSaveReward: async () => null,
  handleDeleteReward: async () => false,
  handleBuyReward: async () => {},
  handleUseReward: async () => {},
  refreshPointsFromDatabase: async () => {},
});

export const useRewards = () => useContext(RewardsContext);

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    rewards,
    totalPoints,
    totalRewardsSupply,
    isLoading,
    saveReward,
    deleteReward,
    buyReward,
    useReward,
    updatePoints,
    refetchRewards,
    refreshPointsFromDatabase,
  } = useRewardsData();

  const handleSaveReward = async (rewardData: any, index: number | null) => {
    return await saveReward({ rewardData, currentIndex: index });
  };

  const handleDeleteReward = async (index: number) => {
    const rewardToDelete = rewards[index];
    if (!rewardToDelete?.id) return false;
    await deleteReward(rewardToDelete.id);
    return true;
  };

  const handleBuyReward = async (id: string, cost: number) => {
    await buyReward({ rewardId: id, cost });
  };

  const handleUseReward = async (id: string) => {
    await useReward(id);
  };

  const setTotalPoints = async (points: number) => {
    await updatePoints(points);
  };

  const value = {
    rewards,
    totalPoints,
    totalRewardsSupply,
    setTotalPoints,
    isLoading,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    refreshPointsFromDatabase,
  };

  return (
    <RewardsContext.Provider value={value}>
      {children}
    </RewardsContext.Provider>
  );
};
