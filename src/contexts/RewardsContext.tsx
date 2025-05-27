
import React, { createContext, useContext, ReactNode } from 'react';
import { RewardsContextType, Reward, ApplyRewardArgs } from './rewards/types';
import { useRewardOperations } from './rewards/useRewardOperations'; // Corrected path
import { logger } from '@/lib/logger'; // Added logger import

const defaultApplyReward = async (args: ApplyRewardArgs): Promise<void> => {
  logger.warn("Default applyReward from RewardsContext used. Ensure RewardsProvider is correctly set up or the specific mutation hook is used.", args);
  // This function is a placeholder. The actual reward application logic
  // (including toasts and point updates) is handled by specific mutation hooks
  // like useBuySubReward, useBuyDomReward, useRedeemSubReward, useRedeemDomReward.
};


const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const rewardOperations = useRewardOperations();

  const contextValue: RewardsContextType = {
    // Data from the hook
    rewards: rewardOperations.rewards || [],
    isLoading: rewardOperations.isLoading,
    error: rewardOperations.error,
    totalPoints: rewardOperations.totalPoints,
    domPoints: rewardOperations.domPoints,
    totalRewardsSupply: rewardOperations.totalRewardsSupply,

    // Operations from the hook (or placeholders if ops are primarily via direct mutation hooks)
    applyReward: defaultApplyReward, // This is a placeholder
    
    // Refetch/utility functions from the hook
    refetchRewards: rewardOperations.refetchRewards,
    getRewardById: rewardOperations.getRewardById, // Added from hook
    
    // Point/Supply setters - These should ideally be managed by mutations,
    // but if direct context update is needed for some reason:
    setTotalPoints: rewardOperations.setTotalPoints, // From hook
    setDomPoints: rewardOperations.setDomPoints, // From hook
  };
  
  return (
    <RewardsContext.Provider value={contextValue}>
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewards = () => {
  const context = useContext(RewardsContext);
  if (context === undefined) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return context;
};
