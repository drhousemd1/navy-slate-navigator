
import React, { createContext, useContext, useEffect } from 'react';
import { Reward } from '@/lib/rewardUtils';
import { supabase } from '@/integrations/supabase/client';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardOperations } from './rewards/useRewardOperations';

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  totalRewardsSupply: 0,
  setTotalPoints: () => {},
  isLoading: true,
  refetchRewards: async () => {},
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
    setRewards,
    isLoading,
    fetchedRewards,
    totalPoints,
    setTotalPoints,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    getTotalRewardsSupply,
    refreshPointsFromDatabase
  } = useRewardOperations();
  
  // Effect to update rewards from fetched data
  useEffect(() => {
    if (fetchedRewards.length > 0) {
      console.log("[RewardsContext] Setting rewards from fetchedRewards with preserved order:", 
        fetchedRewards.map((r, i) => ({ 
          position: i,
          id: r.id, 
          title: r.title,
          created_at: r.created_at
        }))
      );
      setRewards(fetchedRewards);
    }
  }, [fetchedRewards, setRewards]);

  // Add an effect to refresh points on mount
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  // Calculate total rewards supply
  const totalRewardsSupply = getTotalRewardsSupply();

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
