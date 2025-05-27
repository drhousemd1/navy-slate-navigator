
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Reward, ApplyRewardArgs } from './types';
import { fetchRewards, fetchUserPoints, fetchUserDomPoints, fetchTotalRewardsSupply, REWARDS_QUERY_KEY, REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY, REWARDS_SUPPLY_QUERY_KEY } from '@/data/rewards/queries';
import { useAuth } from '@/contexts/auth'; // Ensure correct path
import { useUserIds } from '@/contexts/UserIdsContext'; // Import useUserIds
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';


export const useRewardOperations = () => {
  const { user } = useAuth();
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds(); // Get user IDs from context
  const queryClient = useQueryClient();

  // State for points - these will be primarily driven by React Query but can have local setters for optimistic UI if needed.
  // However, it's generally better to rely on query invalidation.
  const [totalPointsState, setTotalPointsState] = useState<number>(0);
  const [domPointsState, setDomPointsState] = useState<number>(0);

  // Fetch all rewards
  const { data: rewards = [], isLoading: isLoadingRewards, error: errorRewards, refetch: refetchRewardsQuery } = useQuery<Reward[], Error>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    enabled: !!user, // Only fetch if user is available
  });

  // Fetch submissive user's points
  const { data: subPointsData, isLoading: isLoadingSubPoints, refetch: refetchSubPoints } = useQuery<number, Error>({
    queryKey: REWARDS_POINTS_QUERY_KEY,
    queryFn: () => fetchUserPoints(subUserId!), // Assert subUserId is not null due to enabled check
    enabled: !!user && !!subUserId && !isLoadingUserIds,
  });

  // Fetch dominant user's points (Dom Points)
  const { data: domPointsData, isLoading: isLoadingDomPoints, refetch: refetchDomPoints } = useQuery<number, Error>({
    queryKey: REWARDS_DOM_POINTS_QUERY_KEY,
    queryFn: () => fetchUserDomPoints(domUserId!), // Assert domUserId is not null
    enabled: !!user && !!domUserId && !isLoadingUserIds,
  });
  
  // Fetch total supply of all rewards (can be specific per user if needed by adjusting query)
  const { data: totalRewardsSupply = 0, isLoading: isLoadingSupply, refetch: refetchSupply } = useQuery<number, Error>({
    queryKey: REWARDS_SUPPLY_QUERY_KEY, // A generic key for total supply
    queryFn: () => fetchTotalRewardsSupply(subUserId!), // Assuming supply is sub-specific, or adjust if global
    enabled: !!user && !!subUserId && !isLoadingUserIds,
  });

  // Update local state when query data changes
  useEffect(() => {
    if (subPointsData !== undefined) setTotalPointsState(subPointsData);
  }, [subPointsData]);

  useEffect(() => {
    if (domPointsData !== undefined) setDomPointsState(domPointsData);
  }, [domPointsData]);

  // Combined loading state
  const isLoading = isLoadingRewards || isLoadingSubPoints || isLoadingDomPoints || isLoadingSupply || isLoadingUserIds;
  // Combined error state (or handle errors more granularly)
  const error = errorRewards; // Can be expanded to combine errors

  const getRewardById = useCallback((id: string): Reward | undefined => {
    return rewards.find(reward => reward.id === id);
  }, [rewards]);

  // Placeholder for applyReward - actual logic is in mutation hooks
  const applyReward = async (args: ApplyRewardArgs): Promise<void> => {
    logger.warn("[useRewardOperations] applyReward called. This is a placeholder. Use specific mutation hooks.", args);
    // Actual reward application (buy, redeem) should use dedicated mutation hooks
    // (e.g., useBuySubReward, useRedeemDomReward) which handle their own logic,
    // point updates via query invalidation, and toasts.
  };

  const refetchRewards = useCallback(async () => {
    logger.log("[useRewardOperations] Refetching all rewards data including points and supply.");
    try {
      // Invalidate and refetch all relevant queries
      await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      // Optionally, call the direct refetch functions if preferred over invalidation for immediate effect
      // await Promise.all([refetchRewardsQuery(), refetchSubPoints(), refetchDomPoints(), refetchSupply()]);
       toast({ title: "Rewards Data Refreshed", description: "Latest rewards and points loaded." });
    } catch (e) {
      logger.error("[useRewardOperations] Error during refetchRewards:", e);
      toast({ title: "Refresh Error", description: "Could not refresh rewards data.", variant: "destructive" });
    }
  }, [queryClient]); // Removed individual refetch functions from deps as invalidateQueries is used


  return {
    rewards,
    isLoading,
    error,
    totalPoints: totalPointsState,
    domPoints: domPointsState,
    totalRewardsSupply,
    setTotalPoints: setTotalPointsState, // Expose setters if needed for optimistic updates elsewhere
    setDomPoints: setDomPointsState,     // though mutations should ideally handle this.
    applyReward, // Placeholder
    refetchRewards,
    getRewardById,
  };
};
