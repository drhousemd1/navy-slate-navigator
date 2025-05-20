import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types';
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from '../indexedDB/useIndexedDB'; // Import IndexedDB functions
import { logQueryPerformance } from '@/lib/react-query-config';
import { selectWithTimeout, DEFAULT_TIMEOUT_MS } from '@/lib/supabaseUtils'; // For fetching

// Define query keys for rewards
export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards_points']; // Added
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards_dom_points']; // Added
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards_supply']; // Added

// You might also have keys for individual rewards, e.g.
// export const rewardQueryKey = (rewardId: string) => ['rewards', rewardId];

// Default values for processing, similar to fetchRules
const defaultRewardValues = {
  is_dom_reward: false,
  background_opacity: 100,
  icon_name: 'Award',
  icon_color: '#9b87f5',
  title_color: '#FFFFFF',
  subtext_color: '#8E9196',
  calendar_color: '#7E69AB',
  highlight_effect: false,
  focal_point_x: 50,
  focal_point_y: 50,
  supply: 0, // Default supply if not specified
  cost: 10, // Default cost
};

const processRewardData = (reward: any): Reward => {
  return {
    id: reward.id,
    title: reward.title,
    description: reward.description,
    cost: reward.cost ?? defaultRewardValues.cost,
    supply: reward.supply ?? defaultRewardValues.supply,
    is_dom_reward: reward.is_dom_reward ?? defaultRewardValues.is_dom_reward,
    background_image_url: reward.background_image_url,
    background_opacity: reward.background_opacity ?? defaultRewardValues.background_opacity,
    icon_url: reward.icon_url,
    icon_name: reward.icon_name ?? defaultRewardValues.icon_name,
    title_color: reward.title_color ?? defaultRewardValues.title_color,
    subtext_color: reward.subtext_color ?? defaultRewardValues.subtext_color,
    calendar_color: reward.calendar_color ?? defaultRewardValues.calendar_color,
    icon_color: reward.icon_color ?? defaultRewardValues.icon_color,
    highlight_effect: reward.highlight_effect ?? defaultRewardValues.highlight_effect,
    focal_point_x: reward.focal_point_x ?? defaultRewardValues.focal_point_x,
    focal_point_y: reward.focal_point_y ?? defaultRewardValues.focal_point_y,
    created_at: reward.created_at,
    updated_at: reward.updated_at,
    // Ensure all fields from Reward type are covered
  };
};

export const fetchRewards = async (): Promise<Reward[]> => {
  const startTime = performance.now();
  // No longer using localStorage cache directly here; hook `useRewards` handles IndexedDB interaction.
  // This function will now primarily be responsible for fetching from Supabase and processing.
  // The hook `useRewards` will decide whether to call this based on its own IndexedDB cache status.

  console.log("[fetchRewards from queries.ts] Fetching rewards from Supabase server");
  
  try {
    const { data, error } = await selectWithTimeout<Reward>(
      supabase,
      'rewards',
      {
        order: ['created_at', { ascending: false }],
        timeoutMs: DEFAULT_TIMEOUT_MS 
      }
    );
    
    if (error) {
      console.error('[fetchRewards from queries.ts] Supabase error:', error);
      logQueryPerformance('fetchRewards (server-error)', startTime);
      throw error; // Let the calling hook (useRewards) handle fallback to its cache
    }
    
    const processedData = (Array.isArray(data) ? data : (data ? [data] : [])).map(processRewardData);
    logQueryPerformance('fetchRewards (server-success)', startTime, processedData.length);
    
    // The hook `useRewards` will handle saving to IndexedDB.
    return processedData;

  } catch (error) {
    console.error('[fetchRewards from queries.ts] Fetch failed:', error);
    logQueryPerformance('fetchRewards (fetch-exception)', startTime);
    throw error; // Rethrow for the calling hook to handle
  }
};

export const fetchUserPoints = async (): Promise<number> => {
  console.log("[fetchUserPoints] Starting points fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-user-points';
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      console.log("[fetchUserPoints] No user ID found, returning 0 points");
      return 0;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[fetchUserPoints] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchUserPoints', startTime);
    
    // Cache the points value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data?.points || 0));
    } catch (e) {
      console.warn('[fetchUserPoints] Could not cache points:', e);
    }
    
    console.log(`[fetchUserPoints] Retrieved ${data?.points || 0} points`);
    return data?.points || 0;
  } catch (error) {
    console.error('[fetchUserPoints] Fetch failed:', error);
    
    // Try to get cached data
    const cachedPoints = localStorage.getItem(CACHE_KEY);
    if (cachedPoints) {
      console.log('[fetchUserPoints] Using cached points data');
      try {
        return JSON.parse(cachedPoints);
      } catch (parseError) {
        console.error('[fetchUserPoints] Error parsing cached points:', parseError);
      }
    }
    
    return 0;
  }
};

export const fetchUserDomPoints = async (): Promise<number> => {
  console.log("[fetchUserDomPoints] Starting dom points fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-user-dom-points';
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      console.log("[fetchUserDomPoints] No user ID found, returning 0 dom points");
      return 0;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('dom_points')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[fetchUserDomPoints] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchUserDomPoints', startTime);
    
    // Cache the dom points value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data?.dom_points || 0));
    } catch (e) {
      console.warn('[fetchUserDomPoints] Could not cache dom points:', e);
    }
    
    console.log(`[fetchUserDomPoints] Retrieved ${data?.dom_points || 0} dom points`);
    return data?.dom_points || 0;
  } catch (error) {
    console.error('[fetchUserDomPoints] Fetch failed:', error);
    
    // Try to get cached data
    const cachedDomPoints = localStorage.getItem(CACHE_KEY);
    if (cachedDomPoints) {
      console.log('[fetchUserDomPoints] Using cached dom points data');
      try {
        return JSON.parse(cachedDomPoints);
      } catch (parseError) {
        console.error('[fetchUserDomPoints] Error parsing cached dom points:', parseError);
      }
    }
    
    return 0;
  }
};

export const fetchTotalRewardsSupply = async (): Promise<number> => {
  console.log("[fetchTotalRewardsSupply] Starting supply fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-rewards-supply';
  
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('supply');
    
    if (error) {
      console.error('[fetchTotalRewardsSupply] Error:', error);
      throw error;
    }
    
    const total = data?.reduce((total, reward) => total + reward.supply, 0) || 0;
    
    logQueryPerformance('fetchTotalRewardsSupply', startTime);
    
    // Cache the supply value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(total));
    } catch (e) {
      console.warn('[fetchTotalRewardsSupply] Could not cache supply:', e);
    }
    
    console.log(`[fetchTotalRewardsSupply] Total supply: ${total}`);
    return total;
  } catch (error) {
    console.error('[fetchTotalRewardsSupply] Fetch failed:', error);
    
    // Try to get cached data
    const cachedSupply = localStorage.getItem(CACHE_KEY);
    if (cachedSupply) {
      console.log('[fetchTotalRewardsSupply] Using cached supply data');
      try {
        return JSON.parse(cachedSupply);
      } catch (parseError) {
        console.error('[fetchTotalRewardsSupply] Error parsing cached supply:', parseError);
      }
    }
    
    return 0;
  }
};
