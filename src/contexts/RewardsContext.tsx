
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRewards as useRewardsQuery } from '@/data/queries/useRewards';
import { useBuySubReward, useBuyDomReward, useRedeemSubReward, useRedeemDomReward } from '@/data/rewards/mutations';
import { usePoints } from '@/data/points/useUserPointsQuery';
import { useDomPoints } from '@/data/points/useUserDomPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './auth';
import { logger } from '@/lib/logger';
import { resetRewardsUsageData, currentWeekKey } from '@/lib/rewardsUtils';

interface RewardsContextType {
  handleBuyReward: (rewardId: string, cost: number) => Promise<void>;
  handleUseReward: (rewardId: string) => Promise<void>;
  refreshPointsFromDatabase: () => Promise<void>;
  checkAndReloadRewards: () => Promise<void>;
  totalPoints: number;
  domPoints: number;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { subUserId, domUserId } = useUserIds();
  const { data: totalPoints = 0 } = usePoints(subUserId);
  const { data: domPoints = 0 } = useDomPoints(domUserId);
  const buySubRewardMutation = useBuySubReward();
  const buyDomRewardMutation = useBuyDomReward();
  const redeemSubRewardMutation = useRedeemSubReward();
  const redeemDomRewardMutation = useRedeemDomReward();
  const { refetch: refetchRewards, data: rewardsData } = useRewardsQuery();

  const refreshPointsFromDatabase = async () => {
    try {
      await refetchRewards();
      logger.debug('[RewardsContext] Points refreshed from database');
    } catch (error) {
      logger.error('[RewardsContext] Error refreshing points:', error);
    }
  };

  const checkAndReloadRewards = async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const lastWeek = localStorage.getItem("lastWeek");
      const currentWeek = currentWeekKey();
      
      if (lastWeek !== currentWeek) {
        logger.debug('[checkAndReloadRewards] New week detected, resetting rewards usage data');
        await resetRewardsUsageData(user.id);
        localStorage.setItem("lastWeek", currentWeek);
        await refetchRewards();
        logger.debug('[checkAndReloadRewards] Rewards reset completed');
      }
    } catch (error) {
      logger.error('[checkAndReloadRewards] Error checking/reloading rewards:', error);
    }
  };

  const handleBuyReward = async (rewardId: string, cost: number) => {
    try {
      const { data: rewards } = await refetchRewards();
      const reward = rewards?.find(r => r.id === rewardId);
      
      if (!reward) {
        toast({
          title: "Error",
          description: "Reward not found",
          variant: "destructive",
        });
        return;
      }

      if (reward.is_dom_reward) {
        await buyDomRewardMutation.mutateAsync({ 
          rewardId, 
          cost, 
          currentSupply: reward.supply,
          currentDomPoints: domPoints
        });
      } else {
        await buySubRewardMutation.mutateAsync({ 
          rewardId, 
          cost, 
          currentSupply: reward.supply,
          currentPoints: totalPoints
        });
      }
    } catch (error) {
      logger.error('[RewardsContext] Error buying reward:', error);
    }
  };

  const handleUseReward = async (rewardId: string) => {
    try {
      const { data: rewards } = await refetchRewards();
      const reward = rewards?.find(r => r.id === rewardId);
      
      if (!reward) {
        toast({
          title: "Error",
          description: "Reward not found",
          variant: "destructive",
        });
        return;
      }

      if (reward.is_dom_reward) {
        await redeemDomRewardMutation.mutateAsync({ 
          rewardId, 
          currentSupply: reward.supply,
          profileId: domUserId || ''
        });
      } else {
        await redeemSubRewardMutation.mutateAsync({ 
          rewardId, 
          currentSupply: reward.supply,
          profileId: subUserId || ''
        });
      }
    } catch (error) {
      logger.error('[RewardsContext] Error using reward:', error);
    }
  };

  const contextValue: RewardsContextType = {
    handleBuyReward,
    handleUseReward,
    refreshPointsFromDatabase,
    checkAndReloadRewards,
    totalPoints,
    domPoints,
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
