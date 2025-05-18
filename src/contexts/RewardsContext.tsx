import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { Reward } from '@/data/rewards/types';
import { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBuySubReward } from "@/data/rewards/mutations/useBuySubReward";
import { useBuyDomReward } from "@/data/rewards/mutations/useBuyDomReward";
import { useRedeemSubReward } from "@/data/rewards/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "@/data/rewards/mutations/useRedeemDomReward";

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
  refetch: async () => mockQueryResult,
  // Add the missing promise property with the correct type
  promise: Promise.resolve([]) // Promise resolves to empty array of Reward[]
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
  } = useRewardsData();
  
  // These are specific mutation hooks.
  // The handleBuyReward and handleUseReward below might call these or their underlying logic.
  const { mutateAsync: buySubMutation } = useBuySubReward();
  const { mutateAsync: buyDomMutation } = useBuyDomReward();
  const { mutateAsync: redeemSubMutation } = useRedeemSubReward();
  const { mutateAsync: redeemDomMutation } = useRedeemDomReward();

  useEffect(() => {
    console.log("RewardsProvider: Refreshing points from database on mount");
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  const handleSaveReward = async (rewardData: Partial<Reward>, index: number | null): Promise<string | null> => {
    console.log("RewardsContext - handleSaveReward called with data:", rewardData, "index:", index);
    try {
      // saveReward from useRewardsData expects { rewardData: Partial<Reward>, index: number | null }
      // It internally decides whether to create or update.
      const savedReward = await saveReward({ rewardData, currentIndex: index }); // Pass index as currentIndex
      return savedReward?.id || null;
    } catch (error) {
      console.error("Error in RewardsContext handleSaveReward:", error);
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
      await deleteReward(rewardToDelete.id); // deleteReward from useRewardsData takes id
      return true;
    } catch (error) {
      console.error("Error in RewardsContext handleDeleteReward:", error);
      return false;
    }
  };

  const handleBuyReward = async (id: string, cost: number, isDomReward?: boolean) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward) {
      toast({ title: "Error", description: "Reward not found", variant: "destructive" });
      return;
    }
    
    const isRewardDominant = isDomReward !== undefined ? isDomReward : (reward?.is_dom_reward || false);
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !userData.user.id) { // Added null check for user.id
        throw new Error("User not authenticated");
      }
      const profileId = userData.user.id;

      if (isRewardDominant) {
        await buyDomMutation({
          rewardId: id,
          cost,
          currentSupply: reward.supply, // Assuming supply is for buying and increases
          profileId,
          currentDomPoints: domPoints,
        });
      } else {
        await buySubMutation({
          rewardId: id,
          cost,
          currentSupply: reward.supply, // Assuming supply is for buying and increases
          profileId,
          currentPoints: totalPoints,
        });
      }
      toast({ title: "Reward Purchased", description: `You purchased ${reward.title}` });
      // Points and reward supply are updated optimistically and via invalidation by the mutation hooks.
      // Refreshing points explicitly might still be desired or handled by sync manager.
      await refreshPointsFromDatabase(); 
      await refetchRewards();

    } catch (error) {
      console.error("Error in handleBuyReward:", error);
      toast({
        title: "Error",
        description: `Failed to purchase reward. ${error instanceof Error ? error.message : "Please try again."}`,
        variant: "destructive",
      });
      // Consider more robust error recovery or data refetching here.
      await refreshPointsFromDatabase();
      await refetchRewards();
    }
  };

  const handleUseReward = async (id: string) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward) {
      toast({ title: "Error", description: "Reward not found", variant: "destructive" });
      return;
    }
    
    if (reward.supply <= 0) {
      toast({
        title: "Cannot Use Reward",
        description: "You don't have any of this reward to use.", // This message implies supply is user's stock
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !userData.user.id) { // Added null check for user.id
        throw new Error("User not authenticated");
      }
      const profileId = userData.user.id;

      if (reward.is_dom_reward) {
        await redeemDomMutation({ 
          rewardId: id, 
          currentSupply: reward.supply, // Supply is reward's stock to be decremented
          profileId
        });
      } else {
        await redeemSubMutation({ 
          rewardId: id, 
          currentSupply: reward.supply, // Supply is reward's stock to be decremented
          profileId
        });
      }
      // Optimistic update might be handled by mutation hooks.
      // If not, update local state here or rely on query invalidation.
      // The original code had an optimistic update here:
      // const updatedRewards = rewards.map(r => r.id === id ? { ...r, supply: Math.max(0, r.supply - 1) } : r);
      // setRewardsOptimistically(updatedRewards); // This function was removed

      toast({ title: "Reward Used", description: `You used ${reward.title}` });
      await refetchRewards(); // Ensure data consistency

    } catch (error) {
      console.error("Error in handleUseReward:", error);
      await refetchRewards();
      toast({
        title: "Error",
        description: `Failed to use reward. ${error instanceof Error ? error.message : "Please try again."}`,
        variant: "destructive",
      });
    }
  };

  const setTotalPoints = async (points: number) => {
    try {
      await updatePoints(points); // from useRewardsData
    } catch (error) {
      console.error("Error setting total points:", error);
      await refreshPointsFromDatabase(); 
    }
  };

  const setDomPoints = async (points: number) => {
    try {
      await updateDomPoints(points); // from useRewardsData
    } catch (error) {
      console.error("Error setting dom points:", error);
      await refreshPointsFromDatabase();
    }
  };

  const value = useMemo(() => ({
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
  }), [
    rewards, 
    totalPoints, 
    totalRewardsSupply, 
    totalDomRewardsSupply, 
    domPoints, 
    isLoading, 
    refetchRewards, 
    refreshPointsFromDatabase,
    // Ensure functions are stable or wrapped in useCallback if they depend on changing state
    // For now, assuming they are stable enough from useRewardsData or context itself.
  ]);

  return (
    <RewardsContext.Provider value={value}>
      {children}
    </RewardsContext.Provider>
  );
};
