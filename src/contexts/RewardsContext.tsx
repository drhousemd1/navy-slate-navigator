
import React, { createContext, useContext } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  totalRewardsSupply: 0,
  setTotalPoints: () => {},
  isLoading: true,
  refetchRewards: async () => ({
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
    status: 'success',
    fetchStatus: 'idle',
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isPlaceholderData: false,
    isPreviousData: false,
    isRefetching: false,
    isStale: false,
    refetch: async () => ({ 
      data: [], 
      error: null, 
      isError: false, 
      isSuccess: true, 
      isLoading: false, 
      status: 'success',
      // Add rest of properties for nested refetch
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
    })
  }),
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
