
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query"; 
import { supabase } from '@/integrations/supabase/client';
import {
  loadRewardsFromDB, // Assuming similar DB functions exist for rewards
  saveRewardsToDB,   // Assuming similar DB functions exist for rewards
  getLastSyncTimeForRewards, // Assuming similar DB functions exist for rewards
  setLastSyncTimeForRewards    // Assuming similar DB functions exist for rewards
} from "../indexedDB/useIndexedDB"; // Adjust path if reward DB functions are elsewhere or differently named

// Copied from Rewards.tsx for Reward interface, ensure this matches actual structure
export interface Reward {
  id: string;
  title: string;
  description?: string | null;
  cost: number;
  supply: number;
  is_dom_reward: boolean;
  background_image_url?: string | null;
  background_opacity?: number;
  icon_name?: string | null;
  icon_url?: string | null; // Added as it was in original Punishment interface example
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  focal_point_x?: number;
  focal_point_y?: number;
  usage_data?: number[]; // from punishment example
  frequency_count?: number; // from punishment example
  created_at?: string;
  updated_at?: string;
}

// Adjusted RewardsQueryResult to remove isUsingCachedData
export type RewardsQueryResult = UseQueryResult<Reward[], Error>;

// This function assumes similar IndexedDB helpers exist for rewards as for punishments.
// If not, the IndexedDB logic here would need to be adapted or use generic helpers.
async function fetchRewardsWithCache(): Promise<Reward[]> {
  const localData = await loadRewardsFromDB() as Reward[] | null;
  const lastSync = await getLastSyncTimeForRewards();
  let shouldFetch = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    if (timeDiff < 1000 * 60 * 30) { // 30 minutes
      if (localData && localData.length > 0) { // Only skip fetch if localData exists
        shouldFetch = false;
      }
    }
  } else if (localData && localData.length > 0) { // If no sync time but local data, use it initially
     shouldFetch = false;
  }


  if (!shouldFetch && localData) {
    console.log('[useRewards] Returning rewards from IndexedDB');
    return localData;
  }

  console.log('[useRewards] Fetching rewards from server');
  const { data, error } = await supabase.from("rewards").select("*").order('created_at', { ascending: false });

  if (error) {
    console.error('[useRewards] Supabase error fetching rewards:', error);
    if (localData) {
      console.warn('[useRewards] Server fetch failed, returning stale data from IndexedDB');
      return localData; // Return local data if fetch fails
    }
    throw error; // If no local data, throw error
  }

  if (data) {
    const rewardsData = data.map(item => ({
      ...item,
      // Ensure defaults for any potentially missing fields, similar to fetchPunishments
      background_opacity: item.background_opacity ?? 100,
      icon_color: item.icon_color ?? '#9b87f5',
      title_color: item.title_color ?? '#FFFFFF',
      subtext_color: item.subtext_color ?? '#8E9196',
      calendar_color: item.calendar_color ?? '#7E69AB',
      highlight_effect: item.highlight_effect ?? false,
      focal_point_x: item.focal_point_x ?? 50,
      focal_point_y: item.focal_point_y ?? 50,
      // Ensure all fields from Reward interface are present
    })) as Reward[];
    
    await saveRewardsToDB(rewardsData);
    await setLastSyncTimeForRewards(new Date().toISOString());
    return rewardsData;
  }

  return localData || []; // Fallback to localData or empty array
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
