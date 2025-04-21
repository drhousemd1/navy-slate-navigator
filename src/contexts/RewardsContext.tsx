
// Fix: Remove outdated 'cacheTime' from useQuery options, fix rewardUsageMap type conflict, and ensure useRewardOperations returns expected methods.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Reward } from '@/lib/rewardUtils';
import { supabase } from '@/integrations/supabase/client';
import { RewardsContextType } from './rewards/rewardTypes';
import { useRewardOperations } from './rewards/useRewardOperations';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  rewardUsageMap: {},
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

const fetchRewards = async () => {
  try {
    const { data, error } = await supabase.from('rewards').select('*').order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching rewards:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch rewards:', error);
    throw error;
  }
};

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  // rewardUsageMap expected type so use boolean[]
  const [rewardUsageMap, setRewardUsageMap] = useState<{ [id: string]: boolean[] }>({});

  // Fetch rewards using useQuery
  const { data: fetchedRewards, isLoading, refetch } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 20, // 20 minutes
  });

  const { handleSaveReward, handleDeleteReward, handleBuyReward, handleUseReward, refreshPointsFromDatabase, getTotalRewardsSupply } =
    useRewardOperations({ rewards, setRewards, setRewardUsageMap, setTotalPoints, rewardUsageMap });

  // Update local state when fetchedRewards change
  useEffect(() => {
    if (fetchedRewards) {
      setRewards(fetchedRewards);
    }
  }, [fetchedRewards]);

  // Add an effect to refresh points on mount
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  const totalRewardsSupply = getTotalRewardsSupply();

  const value: RewardsContextType = {
    rewards,
    rewardUsageMap,
    totalPoints,
    totalRewardsSupply,
    setTotalPoints,
    isLoading,
    refetchRewards: () => queryClient.invalidateQueries({ queryKey: ['rewards'] }),
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    refreshPointsFromDatabase,
  };

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
};

