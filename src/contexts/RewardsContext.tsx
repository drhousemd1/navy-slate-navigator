import React, { createContext, useContext, useEffect } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { Reward } from '@/lib/rewardUtils';
import { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Create a context with default values
const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  totalRewardsSupply: 0,
  totalDomRewardsSupply: 0,
  domPoints: 0,
  setTotalPoints: async () => Promise.resolve(),
  setDomPoints: async () => Promise.resolve(),
  isLoading: false,
  refetchRewards: async () => {
    return {
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
      isRefetching: false,
      isStale: false,
      errorUpdateCount: 0,
      isInitialLoading: false,
      isPaused: false,
      refetch: async () => ({} as any),
      promise: Promise.resolve([])
    } as QueryObserverResult<Reward[], Error>;
  },
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
    totalDomRewardsSupply,
    setRewardsOptimistically,
    setPointsOptimistically,
    setDomPointsOptimistically,
  } = useRewardsData();

  // Refresh points when the provider mounts
  useEffect(() => {
    console.log("RewardsProvider: Refreshing points from database on mount");
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  // Handle save reward
  const handleSaveReward = async (rewardData: any, index: number | null) => {
    console.log("RewardsContext - handleSaveReward called with data:", rewardData);
    
    const result = await saveReward({ rewardData, currentIndex: index });
    return result?.id || null;
  };

  // Handle delete reward
  const handleDeleteReward = async (index: number) => {
    const rewardToDelete = rewards[index];
    if (!rewardToDelete?.id) return false;
    await deleteReward(rewardToDelete.id);
    return true;
  };

  // Handle buy reward with optimistic update
  const handleBuyReward = async (id: string, cost: number, isDomReward?: boolean) => {
    // Find the reward to check if it's a dom reward
    const reward = rewards.find(r => r.id === id);
    if (!reward) {
      toast({
        title: "Error",
        description: "Reward not found",
        variant: "destructive",
      });
      return;
    }
    
    // Override with the explicit parameter if provided
    const isRewardDominant = isDomReward !== undefined ? isDomReward : (reward?.is_dom_reward || false);
    
    // Check if we have enough points
    const currentPointsValue = isRewardDominant ? domPoints : totalPoints;
    if (currentPointsValue < cost) {
      toast({
        title: "Not Enough Points",
        description: `You need ${cost} ${isRewardDominant ? "dom " : ""}points to buy this reward.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Optimistic update
      if (isRewardDominant) {
        setDomPointsOptimistically(domPoints - cost);
      } else {
        setPointsOptimistically(totalPoints - cost);
      }
      
      // Show immediate feedback
      toast({
        title: "Reward Purchased",
        description: `You purchased ${reward.title}`,
      });
      
      // Perform API call
      await buyReward({ rewardId: id, cost, isDomReward: isRewardDominant });
    } catch (error) {
      console.error("Error in handleBuyReward:", error);
      
      // Refresh data on error
      refreshPointsFromDatabase();
      refetchRewards();
      
      toast({
        title: "Error",
        description: "Failed to purchase reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle use reward
  const handleUseReward = async (id: string) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward) {
      toast({
        title: "Error",
        description: "Reward not found",
        variant: "destructive",
      });
      return;
    }
    
    if (reward.supply <= 0) {
      toast({
        title: "Cannot Use Reward",
        description: "You don't have any of this reward to use.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Optimistic update
      const updatedRewards = rewards.map(r => {
        if (r.id === id) {
          return { ...r, supply: Math.max(0, r.supply - 1) };
        }
        return r;
      });
      setRewardsOptimistically(updatedRewards);
      
      // Show toast
      toast({
        title: "Reward Used",
        description: `You used ${reward.title}`,
      });
      
      // API call
      await useReward(id);
    } catch (error) {
      console.error("Error in handleUseReward:", error);
      refetchRewards();
      
      toast({
        title: "Error",
        description: "Failed to use reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Set total points
  const setTotalPoints = async (points: number) => {
    setPointsOptimistically(points);
    
    try {
      await updatePoints(points);
    } catch (error) {
      console.error("Error setting total points:", error);
      refreshPointsFromDatabase();
    }
  };

  // Set dom points
  const setDomPoints = async (points: number) => {
    setDomPointsOptimistically(points);
    
    try {
      await updateDomPoints(points);
    } catch (error) {
      console.error("Error setting dom points:", error);
      refreshPointsFromDatabase();
    }
  };

  const value = {
    rewards,
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
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
