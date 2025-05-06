
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

  // Store the latest data version when we receive fresh data
  useEffect(() => {
    if (rewards.length > 0) {
      const currentVersion = localStorage.getItem('app-data-version') || '0';
      localStorage.setItem('rewards-data-version', currentVersion);
      localStorage.setItem('rewards-data-timestamp', new Date().toISOString());
    }
  }, [rewards]);

  // Refresh points when the provider mounts with improved version tracking
  useEffect(() => {
    console.log("RewardsProvider: Refreshing points from database on mount");
    
    // Check last refresh time to avoid excessive refreshes
    const lastRefreshTime = localStorage.getItem('points-refresh-time');
    const now = Date.now();
    
    if (!lastRefreshTime || (now - parseInt(lastRefreshTime)) > 5000) {
      refreshPointsFromDatabase().then(() => {
        localStorage.setItem('points-refresh-time', now.toString());
      });
    } else {
      console.log("Points were refreshed recently, skipping redundant refresh");
    }
  }, [refreshPointsFromDatabase]);

  const handleSaveReward = async (rewardData: any, index: number | null) => {
    console.log("RewardsContext - handleSaveReward called with data:", rewardData);
    console.log("is_dom_reward value in handleSaveReward:", rewardData.is_dom_reward);
    
    try {
      const result = await saveReward({ rewardData, currentIndex: index });
      
      // After successful save, increment the data version to trigger sync
      const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
      localStorage.setItem('app-data-version', (currentVersion + 1).toString());
      
      return result?.id || null;
    } catch (error) {
      console.error("Error in handleSaveReward:", error);
      
      // Show error toast
      toast({
        title: "Error Saving Reward",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
      
      return null;
    }
  };

  const handleDeleteReward = async (index: number) => {
    const rewardToDelete = rewards[index];
    if (!rewardToDelete?.id) return false;
    
    try {
      await deleteReward(rewardToDelete.id);
      
      // After successful delete, increment the data version to trigger sync
      const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
      localStorage.setItem('app-data-version', (currentVersion + 1).toString());
      
      return true;
    } catch (error) {
      console.error("Error in handleDeleteReward:", error);
      
      // Show error toast
      toast({
        title: "Error Deleting Reward",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
      });
      
      return false;
    }
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
    
    // Optimistic updates for immediate UI feedback
    try {
      // 1. Update points optimistically
      const newPointsValue = currentPointsValue - cost;
      if (isRewardDominant) {
        setDomPointsOptimistically(newPointsValue);
      } else {
        setPointsOptimistically(newPointsValue);
      }
      
      // 2. Update reward supply optimistically
      const updatedRewards = rewards.map(r => {
        if (r.id === id) {
          return { ...r, supply: r.supply + 1 };
        }
        return r;
      });
      setRewardsOptimistically(updatedRewards);
      
      // 3. Show toast for immediate feedback
      toast({
        title: "Reward Purchased",
        description: `You purchased ${reward.title}`,
      });
      
      // 4. Perform the actual API call in the background
      await buyReward({ rewardId: id, cost, isDomReward: isRewardDominant });
      
      // 5. After successful buy, increment the data version to trigger sync
      const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
      localStorage.setItem('app-data-version', (currentVersion + 1).toString());
    } catch (error) {
      console.error("Error in handleBuyReward:", error);
      
      // Revert optimistic updates on error
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
      
      // After successful use, increment the data version to trigger sync
      const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
      localStorage.setItem('app-data-version', (currentVersion + 1).toString());
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
      
      // After successful update, increment the data version to trigger sync
      const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
      localStorage.setItem('app-data-version', (currentVersion + 1).toString());
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
      
      // After successful update, increment the data version to trigger sync
      const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
      localStorage.setItem('app-data-version', (currentVersion + 1).toString());
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
