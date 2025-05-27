import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { RewardsContextType, SaveRewardParams } from './rewards/rewardTypes'; // SaveRewardParams might not be needed here if handleSaveReward signature changes
import { useRewardsData } from '@/data/RewardsDataHandler'; // Changed import path
import { Reward } from '@/data/rewards/types';
import { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger'; // Added logger import
// Specific mutation hooks like useBuySubReward are used within useRewardsData from RewardsDataHandler
// So they are not directly needed here anymore if we rely on the handlers from useRewardsData.

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
  refetch: async () => mockQueryResult,
  promise: Promise.resolve([] as Reward[]) // Corrected promise type
};

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  totalRewardsSupply: 0,
  totalDomRewardsSupply: 0,
  domPoints: 0,
  setTotalPoints: async () => {}, // Adjusted to Promise<void>
  setDomPoints: async () => {}, // Adjusted to Promise<void>
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
    domPoints = 0, // domPoints is directly available from RewardsDataHandler
    isLoading,
    saveReward, // from RewardsDataHandler
    deleteReward, // from RewardsDataHandler
    buyReward,    // from RewardsDataHandler
    useReward,    // from RewardsDataHandler
    updatePoints, // from RewardsDataHandler (renamed from setTotalPoints)
    updateDomPoints, // from RewardsDataHandler (renamed from setDomPoints)
    refetchRewards,
    refreshPointsFromDatabase,
    totalDomRewardsSupply, // from RewardsDataHandler
  } = useRewardsData();
  
  useEffect(() => {
    // logger.debug("RewardsProvider: Refreshing points from database on mount"); // Already in RewardsDataHandler
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  // handleSaveReward now directly uses `saveReward` from `useRewardsData` (RewardsDataHandler)
  // which expects `SaveRewardParams` { rewardData, currentIndex }
  const handleSaveReward = async (rewardData: Partial<Reward>, index: number | null): Promise<string | null> => {
    logger.debug("RewardsContext - handleSaveReward called with data:", rewardData, "index:", index);
    try {
      const params: SaveRewardParams = { rewardData, currentIndex: index };
      if (rewardData.id && index !== null) { // For update, ensure ID is part of rewardData
         params.rewardData = { ...rewardData, id: rewardData.id };
      } else if (!rewardData.id && index === null) { // For create
        // ID is not needed for creation in `saveReward` from `RewardsDataHandler`
      }

      const savedReward = await saveReward(params);
      return savedReward?.id || null;
    } catch (error) {
      logger.error("Error in RewardsContext handleSaveReward:", error);
      // Toasting is likely handled within `saveReward` or its underlying mutations
      return null;
    }
  };

  // handleDeleteReward now directly uses `deleteReward` from `useRewardsData` (RewardsDataHandler)
  // which expects a rewardId string.
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

  // handleBuyReward now directly uses `buyReward` from `useRewardsData` (RewardsDataHandler)
  const handleBuyRewardWrapper = async (id: string, cost: number, isDomRewardGiven?: boolean) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward) {
        toast({ title: "Reward not found", description: "Cannot buy a non-existent reward.", variant: "destructive" });
        return;
    }
    // buyReward in RewardsDataHandler infers isDomReward from the reward object itself.
    // It expects { rewardId: string, cost: number }
    try {
        await buyReward({ rewardId: id, cost });
        // Toasting and state updates handled by buyReward from RewardsDataHandler
    } catch (error) {
        logger.error("Error in RewardsContext handleBuyRewardWrapper:", error);
        // Error toast likely handled by the mutation hook within buyReward
    }
  };

  // handleUseReward now directly uses `useReward` from `useRewardsData` (RewardsDataHandler)
  const handleUseRewardWrapper = async (id: string) => {
     const reward = rewards.find(r => r.id === id);
    if (!reward) {
        toast({ title: "Reward not found", description: "Cannot use a non-existent reward.", variant: "destructive" });
        return;
    }
    // useReward in RewardsDataHandler expects { rewardId: string }
    try {
        await useReward({ rewardId: id });
        // Toasting and state updates handled by useReward
    } catch (error) {
        logger.error("Error in RewardsContext handleUseRewardWrapper:", error);
    }
  };
  
  const setTotalPointsWrapper = async (points: number) => {
    try {
      await updatePoints(points); // from RewardsDataHandler
    } catch (error) {
      logger.error("Error setting total points:", error);
      await refreshPointsFromDatabase(); 
    }
  };

  const setDomPointsWrapper = async (points: number) => {
    try {
      await updateDomPoints(points); // from RewardsDataHandler
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
    // Wrap functions from useRewardsData in useCallback within useRewardsData if they cause re-renders,
    // or ensure they are stable. For context, direct usage or simple wrappers are fine.
    // Functions from useRewardsData are generally stable due to useMutation/useQuery.
    refetchRewards, 
    refreshPointsFromDatabase,
    saveReward, // Add dependencies from useRewardsData if they are not stable
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
