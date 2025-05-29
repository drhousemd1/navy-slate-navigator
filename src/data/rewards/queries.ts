
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { Reward } from "./types";
import { fetchRewards } from "./queries/fetchRewards";
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { useUserIds } from '@/contexts/UserIdsContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom-points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

export { fetchRewards };

export const fetchUserPoints = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    logger.debug("[fetchUserPoints] No authenticated user");
    return 0;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userData.user.id)
    .single();

  if (error) {
    logger.error('[fetchUserPoints] Error fetching user points:', error);
    return 0;
  }

  return data?.points || 0;
};

export const fetchUserDomPoints = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    logger.debug("[fetchUserDomPoints] No authenticated user");
    return 0;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('dom_points')
    .eq('id', userData.user.id)
    .single();

  if (error) {
    logger.error('[fetchUserDomPoints] Error fetching user dom points:', error);
    return 0;
  }

  return data?.dom_points || 0;
};

export const fetchTotalRewardsSupply = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    logger.debug("[fetchTotalRewardsSupply] No authenticated user");
    return 0;
  }

  const { data, error } = await supabase
    .from('rewards')
    .select('supply')
    .eq('user_id', userData.user.id);

  if (error) {
    logger.error('[fetchTotalRewardsSupply] Error fetching total rewards supply:', error);
    return 0;
  }

  return data?.reduce((total, reward) => total + (reward.supply || 0), 0) || 0;
};

export function useRewardsQuery() {
  const { subUserId, domUserId } = useUserIds();
  
  return useQuery<Reward[], Error>({
    queryKey: [...REWARDS_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchRewards(subUserId, domUserId),
    ...STANDARD_QUERY_CONFIG,
    // Use proper caching strategy as per APP CODE GUIDE
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !!(subUserId || domUserId), // Only run if we have at least one user ID
  });
}
