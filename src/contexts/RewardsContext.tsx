import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { Reward } from '@/lib/rewardUtils';
import { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

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
  totalDomRewardsSupply: 0,
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
    totalDomRewardsSupply,
    // Extract setter functions for optimistic updates
    setRewardsOptimistically,
    setPointsOptimistically,
    setDomPointsOptimistically,
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
    
    console.log("Buying reward with id:", id, "cost:", cost, "isDomReward:", isRewardDominant);
    
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
      // Perform optimistic update for immediate UI feedback
      const newPointsValue = currentPointsValue - cost;
      
      // Update the appropriate points immediately - both local state and cache
      if (isRewardDominant) {
        // Update DOM points optimistically
        setDomPointsOptimistically(newPointsValue);
      } else {
        // Update regular points optimistically
        setPointsOptimistically(newPointsValue);
      }
      
      // Optimistically update the reward supply
      const updatedRewards = rewards.map(r => {
        if (r.id === id) {
          return { ...r, supply: r.supply + 1 };
        }
        return r;
      });
      setRewardsOptimistically(updatedRewards);
      
      // Show toast for immediate feedback
      toast({
        title: "Reward Purchased",
        description: `You purchased ${reward.title}`,
      });
      
      // Perform the actual API call in the background with proper parameters
      await buyReward({ rewardId: id, cost, isDomReward: isRewardDominant });
    } catch (error) {
      console.error("Error in handleBuyReward:", error);
      
      // On error, refresh data from the server
      refreshPointsFromDatabase();
      refetchRewards();
      
      toast({
        title: "Error",
        description: "Failed to purchase reward. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      // Optimistic update for immediate UI feedback
      const updatedRewards = rewards.map(r => {
        if (r.id === id) {
          return { ...r, supply: Math.max(0, r.supply - 1) };
        }
        return r;
      });
      setRewardsOptimistically(updatedRewards);
      
      // Show toast for immediate feedback
      toast({
        title: "Reward Used",
        description: `You used ${reward.title}`,
      });
      
      // Perform the actual API call in the background
      await useReward(id);
    } catch (error) {
      console.error("Error in handleUseReward:", error);
      
      // Revert optimistic updates on error
      refetchRewards();
      
      toast({
        title: "Error",
        description: "Failed to use reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  const setTotalPoints = async (points: number) => {
    // Optimistic update
    setPointsOptimistically(points);
    
    // Persist to database
    try {
      await updatePoints(points);
    } catch (error) {
      console.error("Error setting total points:", error);
      refreshPointsFromDatabase(); // Revert on error
    }
  };

  const setDomPoints = async (points: number) => {
    // Optimistic update
    setDomPointsOptimistically(points);
    
    // Persist to database
    try {
      await updateDomPoints(points);
    } catch (error) {
      console.error("Error setting dom points:", error);
      refreshPointsFromDatabase(); // Revert on error
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
