import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { RewardsContextType, SaveRewardParams } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { Reward } from '@/data/rewards/types';
import { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

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
  promise: Promise.resolve([] as Reward[])
};

const RewardsContext = createContext<RewardsContextType>({
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
  } = useRewardsData();
  
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  const handleSaveReward = async (rewardData: Partial<Reward>, index: number | null): Promise<string | null> => {
    logger.debug("RewardsContext - handleSaveReward called with data:", rewardData, "index:", index);
    try {
      const params: SaveRewardParams = { rewardData, currentIndex: index };
      if (rewardData.id && index !== null) {
         params.rewardData = { ...rewardData, id: rewardData.id };
      } else if (!rewardData.id && index === null) {
        // ID is not needed for creation
      }

      const savedReward = await saveReward(params);
      return savedReward?.id || null;
    } catch (error) {
      logger.error("Error in RewardsContext handleSaveReward:", error);
      return null;
    }
  };

  const handleDeleteReward = async (index: number): Promise<boolean> => {
    const rewardToDelete = rewards[index];
    if (!rewardToDelete?.id) {
      toast({ title: "Error", description: "Reward ID not found for deletion.", variant: "destructive" });
      return false;
    }
    try {
      return await deleteReward(rewardToDelete.id);
    } catch (error) {
      logger.error("Error in RewardsContext handleDeleteReward:", error);
      return false;
    }
  };

  const handleBuyRewardWrapper = async (id: string, cost: number) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward) {
        toast({ title: "Reward not found", description: "Cannot buy a non-existent reward.", variant: "destructive" });
        return;
    }
    
    try {
        logger.debug("RewardsContext - buying reward:", { id, cost, isDom: reward.is_dom_reward });
        await buyReward({ rewardId: id, cost });
    } catch (error) {
        logger.error("Error in RewardsContext handleBuyRewardWrapper:", error);
    }
  };

  const handleUseRewardWrapper = async (id: string) => {
     const reward = rewards.find(r => r.id === id);
    if (!reward) {
        toast({ title: "Reward not found", description: "Cannot use a non-existent reward.", variant: "destructive" });
        return;
    }
    
    try {
        logger.debug("RewardsContext - using reward:", { id, isDom: reward.is_dom_reward });
        await useReward({ rewardId: id });
    } catch (error) {
        logger.error("Error in RewardsContext handleUseRewardWrapper:", error);
    }
  };
  
  const setTotalPointsWrapper = async (points: number) => {
    try {
      await updatePoints(points);
    } catch (error) {
      logger.error("Error setting total points:", error);
      await refreshPointsFromDatabase(); 
    }
  };

  const setDomPointsWrapper = async (points: number) => {
    try {
      await updateDomPoints(points);
    } catch (error) {
      logger.error("Error setting dom points:", error);
      await refreshPointsFromDatabase();
    }
  };

  const value = useMemo(() => ({
    rewards,
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints,
    setTotalPoints: setTotalPointsWrapper,
    setDomPoints: setDomPointsWrapper,
    isLoading,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward: handleBuyRewardWrapper,
    handleUseReward: handleUseRewardWrapper,
    refreshPointsFromDatabase,
  }), [
    rewards, 
    totalPoints, 
    totalRewardsSupply, 
    totalDomRewardsSupply, 
    domPoints, 
    isLoading, 
    refetchRewards, 
    refreshPointsFromDatabase,
    saveReward,
    deleteReward,
    buyReward,
    useReward,
    updatePoints,
    updateDomPoints,
  ]);

  return (
    <RewardsContext.Provider value={value}>
      {children}
    </RewardsContext.Provider>
  );
};
