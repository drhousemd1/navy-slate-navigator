
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query"; 
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../rewards/types'; // Import Reward type from the canonical source
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/useIndexedDB";
import { logger } from '@/lib/logger'; // Added logger import

// Local Reward interface definition removed, as we are now importing it.

export type RewardsQueryResult = UseQueryResult<Reward[], Error>;

async function fetchRewardsWithCache(): Promise<Reward[]> {
  const localData = await loadRewardsFromDB() as Reward[] | null;
  const lastSync = await getLastSyncTimeForRewards();
  let shouldFetch = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    if (timeDiff < 1000 * 60 * 30) { // 30 minutes
      if (localData && localData.length > 0) {
        shouldFetch = false;
      }
    }
  } else if (localData && localData.length > 0) {
     shouldFetch = false;
  }


  if (!shouldFetch && localData) {
    logger.debug('[useRewards] Returning rewards from IndexedDB');
    return localData;
  }

  logger.debug('[useRewards] Fetching rewards from server');
  const { data, error } = await supabase.from("rewards").select("*").order('created_at', { ascending: false });

  if (error) {
    logger.error('[useRewards] Supabase error fetching rewards:', error);
    if (localData) {
      logger.warn('[useRewards] Server fetch failed, returning stale data from IndexedDB');
      return localData;
    }
    throw error;
  }

  if (data) {
    // Ensure the data conforms to the imported Reward type
    const rewardsData: Reward[] = data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description === undefined ? null : item.description, // Ensure null if undefined
      cost: item.cost,
      supply: item.supply,
      is_dom_reward: item.is_dom_reward,
      background_image_url: item.background_image_url === undefined ? null : item.background_image_url,
      background_opacity: item.background_opacity ?? 100,
      icon_name: item.icon_name === undefined ? null : item.icon_name,
      icon_url: null, // icon_url is not in the database table, set to null
      icon_color: item.icon_color ?? '#9b87f5',
      title_color: item.title_color ?? '#FFFFFF',
      subtext_color: item.subtext_color ?? '#8E9196',
      calendar_color: item.calendar_color ?? '#7E69AB',
      highlight_effect: item.highlight_effect ?? false,
      focal_point_x: item.focal_point_x ?? 50,
      focal_point_y: item.focal_point_y ?? 50,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
    
    await saveRewardsToDB(rewardsData);
    await setLastSyncTimeForRewards(new Date().toISOString());
    return rewardsData;
  }

  return localData || [];
}

export function useRewards(): RewardsQueryResult {
  return useQuery<Reward[], Error>({
    queryKey: ["rewards"],
    queryFn: fetchRewardsWithCache,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
  });
}
