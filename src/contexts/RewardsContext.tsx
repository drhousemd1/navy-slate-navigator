import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardsData } from '@/data/rewards/useRewardsData';
import { Reward } from '@/data/rewards/types';
import { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBuySubReward } from "@/data/mutations/useBuySubReward";
import { useBuyDomReward } from "@/data/mutations/useBuyDomReward";
import { useRedeemSubReward } from "@/data/mutations/useRedeemSubReward";
import { useRedeemDomReward } from "@/data/mutations/useRedeemDomReward";

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
    setRewardsOptimistically,
    setPointsOptimistically,
    setDomPointsOptimistically,
  } = useRewardsData();
  
  const { mutateAsync: buySub } = useBuySubReward();
  const { mutateAsync: buyDom } = useBuyDomReward();
  const { mutateAsync: redeemSub } = useRedeemSubReward();
  const { mutateAsync: redeemDom } = useRedeemDomReward();

  async function handleBuySubReward(args: any) { 
    await buySub(args); 
  }
  
  async function handleBuyDomReward(args: any) { 
    await buyDom(args); 
  }
  
  async function handleRedeemSubReward(args: any) { 
    await redeemSub(args); 
  }
  
  async function handleRedeemDomReward(args: any) { 
    await redeemDom(args); 
  }

  useEffect(() => {
    console.log("RewardsProvider: Refreshing points from database on mount");
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  const handleSaveReward = async (rewardData: any, index: number | null): Promise<string | null> => {
    console.log("RewardsContext - handleSaveReward called with data:", rewardData);
    try {
      const savedReward = await saveReward({ rewardData });
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
      await deleteReward(rewardToDelete.id);
      return true;
    } catch (error) {
      console.error("Error in RewardsContext handleDeleteReward:", error);
      return false;
    }
  };

  const handleBuyReward = async (id: string, cost: number, isDomReward?: boolean) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward) {
      toast({
        title: "Error",
        description: "Reward not found",
        variant: "destructive",
      });
      return;
    }
    
    const isRewardDominant = isDomReward !== undefined ? isDomReward : (reward?.is_dom_reward || false);
    console.log("Buying reward with id:", id, "cost:", cost, "isDomReward:", isRewardDominant);
    
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
      toast({
        title: "Reward Purchased",
        description: `You purchased ${reward.title}`,
      });
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }
      
      await buyReward({ rewardId: id, cost });

    } catch (error) {
      console.error("Error in handleBuyReward:", error);
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
      const updatedRewards = rewards.map(r => {
        if (r.id === id) {
          return { ...r, supply: Math.max(0, r.supply - 1) };
        }
        return r;
      });
      setRewardsOptimistically(updatedRewards);
      
      toast({
        title: "Reward Used",
        description: `You used ${reward.title}`,
      });
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      await useReward({ rewardId: id });

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

  const setTotalPoints = async (points: number) => {
    setPointsOptimistically(points);
    try {
      await updatePoints(points);
    } catch (error) {
      console.error("Error setting total points:", error);
      refreshPointsFromDatabase(); 
    }
  };

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
