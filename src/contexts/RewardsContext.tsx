
import React, { createContext, useContext, useEffect } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { Reward } from '@/lib/rewardUtils';
import { QueryObserverResult } from '@tanstack/react-query';

// Create a complete mock observer result that satisfies the QueryObserverResult type
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
  // The refetch function needs to return the same type
  refetch: async () => mockQueryResult
};

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  totalRewardsSupply: 0,
  domPoints: 0,
  setTotalPoints: async () => Promise.resolve(),
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
    domPoints = 0,
    isLoading,
    saveReward,
    deleteReward,
    buyReward,
    useReward,
    updatePoints,
    refetchRewards,
    refreshPointsFromDatabase,
  } = useRewardsData();

  // Refresh points when the provider mounts
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  const handleSaveReward = async (rewardData: any, index: number | null) => {
    const result = await saveReward({ rewardData, currentIndex: index });
    return result?.id || null;
  };

  const handleDeleteReward = async (index: number) => {
    const rewardToDelete = rewards[index];
    if (!rewardToDelete?.id) return false;
    await deleteReward(rewardToDelete.id);
    return true;
  };

  const handleBuyReward = async (id: string, cost: number) => {
    // Make sure we have the most up-to-date points
    await refreshPointsFromDatabase();
    
    // Now attempt to buy the reward with fresh point data
    await buyReward({ rewardId: id, cost });
    
    // Refresh points again to ensure UI is in sync
    await refreshPointsFromDatabase();
  };

  const handleUseReward = async (id: string) => {
    await useReward(id);
    
    // Refresh everything to ensure UI is in sync
    await refreshPointsFromDatabase();
  };

  const setTotalPoints = async (points: number) => {
    await updatePoints(points);
    
    // Make sure points are refreshed after updating
    await refreshPointsFromDatabase();
  };

  const value = {
    rewards,
    totalPoints,
    totalRewardsSupply,
    domPoints,
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
