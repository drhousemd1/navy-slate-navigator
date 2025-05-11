
/**
 * DO NOT IMPLEMENT DATA LOGIC HERE.
 * This is only a wrapper around the centralized data hooks in /src/data/
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
import { Reward } from '@/lib/rewardUtils';
import { useRewardsData } from '@/data';

// Define the context type
interface RewardsContextType {
  rewards: Reward[];
  isLoading: boolean;
  error: Error | null;
  handleSaveReward: (rewardData: Partial<Reward>, currentIndex?: number | null) => Promise<Reward | null>;
  handleDeleteReward: (rewardId: string) => Promise<boolean>;
  handleBuyReward: (reward: Reward) => Promise<boolean>;
  refetchRewards: () => Promise<QueryObserverResult<Reward[], Error>>;
  // Add these missing properties
  totalPoints: number;
  totalRewardsSupply: number;
  totalDomRewardsSupply: number;
  domPoints: number;
  refreshPointsFromDatabase: () => Promise<void>;
  setTotalPoints: (points: number) => void;
  setDomPoints: (points: number) => void;
  handleUseReward: (reward: Reward) => Promise<boolean>;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the centralized data hook
  const { 
    rewards, 
    isLoading, 
    error, 
    saveReward, 
    deleteReward, 
    buyReward,
    useReward,
    refetchRewards,
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints,
    refreshPointsFromDatabase,
    setPointsOptimistically: setTotalPoints,
    setDomPointsOptimistically: setDomPoints
  } = useRewardsData();

  const value: RewardsContextType = {
    rewards,
    isLoading,
    error,
    handleSaveReward: saveReward,
    handleDeleteReward: deleteReward,
    handleBuyReward: buyReward,
    refetchRewards,
    totalPoints,
    totalRewardsSupply,
    totalDomRewardsSupply,
    domPoints,
    refreshPointsFromDatabase,
    setTotalPoints,
    setDomPoints,
    handleUseReward: useReward
  };

  return (
    <RewardsContext.Provider value={value}>
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewards = (): RewardsContextType => {
  const context = useContext(RewardsContext);
  if (context === undefined) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return context;
};
