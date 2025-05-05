
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
  setDomPoints: async () => Promise.resolve(),
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
    updateDomPoints,
    refetchRewards,
    refreshPointsFromDatabase,
  } = useRewardsData();

  // Refresh points when the provider mounts
  useEffect(() => {
    console.log("RewardsProvider: Refreshing points from database on mount");
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  const handleSaveReward = async (rewardData: any, index: number | null) => {
    console.log("RewardsContext - handleSaveReward called with data:", rewardData);
    console.log("is_dom_reward value in handleSaveReward:", rewardData.is_dom_reward);
    
    const result = await saveReward({ rewardData, currentIndex: index });
    return result?.id || null;
  };

  const handleDeleteReward = async (index: number) => {
    const rewardToDelete = rewards[index];
    if (!rewardToDelete?.id) return false;
    await deleteReward(rewardToDelete.id);
    return true;
  };

  const handleBuyReward = async (id: string, cost: number, isDomReward?: boolean) => {
    // Make sure we have the most up-to-date points
    await refreshPointsFromDatabase();
    
    // Find the reward to check if it's a dom reward
    const reward = rewards.find(r => r.id === id);
    
    // Override with the explicit parameter if provided
    const isRewardDominant = isDomReward !== undefined ? isDomReward : (reward?.is_dom_reward || false);
    
    console.log("Buying reward with id:", id, "cost:", cost, "isDomReward:", isRewardDominant);
    
    // Now attempt to buy the reward with fresh point data
    await buyReward({ rewardId: id, cost, isDomReward: isRewardDominant });
    
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

  const setDomPoints = async (points: number) => {
    await updateDomPoints(points);
    
    // Make sure points are refreshed after updating
    await refreshPointsFromDatabase();
  };

  const value = {
    rewards,
    totalPoints,
    totalRewardsSupply,
    domPoints,
    setTotalPoints,
    setDomPoints,
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
