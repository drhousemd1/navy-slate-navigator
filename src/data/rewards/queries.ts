import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types';
import { logQueryPerformance, STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { selectWithTimeout, DEFAULT_TIMEOUT_MS } from '@/lib/supabaseUtils';
import { logger } from '@/lib/logger';
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from '../indexedDB/useIndexedDB';

// Define RawSupabaseReward locally as src/data/rewards/types.ts is not in allowed-files
interface RawSupabaseReward {
  id: string;
  title: string;
  description?: string | null;
  cost: number;
  supply?: number | null;
  is_dom_reward?: boolean | null;
  background_image_url?: string | null;
  background_opacity?: number | null;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color?: string | null;
  subtext_color?: string | null;
  calendar_color?: string | null;
  icon_color?: string | null;
  highlight_effect?: boolean | null;
  focal_point_x?: number | null;
  focal_point_y?: number | null;
  created_at: string;
  updated_at: string;
}

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom_points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

// Default values for processing
const defaultRewardValues = {
  cost: 10,
  supply: 0,
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
};

// This is the consolidated processRewardData function
export const processRewardData = (reward: RawSupabaseReward): Reward => {
  return {
    id: reward.id,
    title: reward.title,
    description: reward.description ?? undefined,
    cost: reward.cost ?? defaultRewardValues.cost,
    supply: reward.supply ?? defaultRewardValues.supply,
    is_dom_reward: reward.is_dom_reward ?? defaultRewardValues.is_dom_reward,
    background_image_url: reward.background_image_url ?? undefined,
    background_opacity: reward.background_opacity ?? defaultRewardValues.background_opacity,
    icon_url: reward.icon_url ?? undefined,
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
  };
};

export const fetchRewards = async (): Promise<Reward[]> => {
  const startTime = performance.now();
  logger.debug("[fetchRewards] Starting fetch process");
  
  try {
    // Step 1: Check IndexedDB cache first
    const localData = await loadRewardsFromDB();
    const lastSync = await getLastSyncTimeForRewards();
    let shouldFetchFromServer = true;

    // Step 2: Check if we can use cached data (30 min threshold)
    if (lastSync) {
      const timeDiff = Date.now() - new Date(lastSync).getTime();
      if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) {
        shouldFetchFromServer = false;
      }
    } else if (localData && localData.length > 0) {
      shouldFetchFromServer = false;
    }

    if (!shouldFetchFromServer && localData) {
      logger.debug("[fetchRewards] Using cached data from IndexedDB");
      logQueryPerformance('fetchRewards (cache-hit)', startTime, localData.length);
      return localData;
    }

    // Step 3: Fetch from server
    logger.debug("[fetchRewards] Fetching rewards from Supabase server");
    
    const { data, error } = await selectWithTimeout<RawSupabaseReward>(
      supabase,
      'rewards',
      {
        order: ['created_at', { ascending: false }],
        timeoutMs: DEFAULT_TIMEOUT_MS 
      }
    );
    
    if (error) {
      logger.error('[fetchRewards] Supabase error:', error);
      logQueryPerformance('fetchRewards (server-error)', startTime);
      
      // Step 4: Fallback to cached data on error
      if (localData) {
        logger.warn('[fetchRewards] Server fetch failed, returning cached data');
        return localData;
      }
      throw error;
    }
    
    // Step 5: Process and cache the data
    const rawRewards = (Array.isArray(data) ? data : (data ? [data] : [])) as RawSupabaseReward[];
    const processedData = rawRewards.map(processRewardData);
    
    // Step 6: Save to IndexedDB and update sync time
    await saveRewardsToDB(processedData);
    await setLastSyncTimeForRewards(new Date().toISOString());
    
    logQueryPerformance('fetchRewards (server-success)', startTime, processedData.length);
    logger.debug(`[fetchRewards] Successfully fetched ${processedData.length} rewards from server`);
    
    return processedData;

  } catch (error) {
    logger.error('[fetchRewards] Fetch failed:', error);
    logQueryPerformance('fetchRewards (fetch-exception)', startTime);
    
    // Final fallback to cached data
    try {
      const fallbackData = await loadRewardsFromDB();
      if (fallbackData) {
        logger.warn('[fetchRewards] Using fallback cached data due to fetch error');
        return fallbackData;
      }
    } catch (cacheError) {
      logger.error('[fetchRewards] Cache fallback also failed:', cacheError);
    }
    
    throw error;
  }
};

export const fetchUserPoints = async (): Promise<number> => {
  logger.debug("[fetchUserPoints] Starting points fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-user-points';
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      logger.debug("[fetchUserPoints] No user ID found, returning 0 points");
      return 0;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error('[fetchUserPoints] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchUserPoints', startTime);
    
    // Cache the points value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data?.points || 0));
    } catch (e) {
      logger.warn('[fetchUserPoints] Could not cache points:', e);
    }
    
    logger.debug(`[fetchUserPoints] Retrieved ${data?.points || 0} points`);
    return data?.points || 0;
  } catch (error) {
    logger.error('[fetchUserPoints] Fetch failed:', error);
    
    // Try to get cached data
    const cachedPoints = localStorage.getItem(CACHE_KEY);
    if (cachedPoints) {
      logger.debug('[fetchUserPoints] Using cached points data');
      try {
        return JSON.parse(cachedPoints);
      } catch (parseError) {
        logger.error('[fetchUserPoints] Error parsing cached points:', parseError);
      }
    }
    
    return 0;
  }
};

export const fetchUserDomPoints = async (): Promise<number> => {
  logger.debug("[fetchUserDomPoints] Starting dom points fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-user-dom-points';
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      logger.debug("[fetchUserDomPoints] No user ID found, returning 0 dom points");
      return 0;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('dom_points')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error('[fetchUserDomPoints] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchUserDomPoints', startTime);
    
    // Cache the dom points value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data?.dom_points || 0));
    } catch (e) {
      logger.warn('[fetchUserDomPoints] Could not cache dom points:', e);
    }
    
    logger.debug(`[fetchUserDomPoints] Retrieved ${data?.dom_points || 0} dom points`);
    return data?.dom_points || 0;
  } catch (error) {
    logger.error('[fetchUserDomPoints] Fetch failed:', error);
    
    // Try to get cached data
    const cachedDomPoints = localStorage.getItem(CACHE_KEY);
    if (cachedDomPoints) {
      logger.debug('[fetchUserDomPoints] Using cached dom points data');
      try {
        return JSON.parse(cachedDomPoints);
      } catch (parseError) {
        logger.error('[fetchUserDomPoints] Error parsing cached dom points:', parseError);
      }
    }
    
    return 0;
  }
};

export const fetchTotalRewardsSupply = async (): Promise<number> => {
  logger.debug("[fetchTotalRewardsSupply] Starting supply fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-rewards-supply';
  
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('supply');
    
    if (error) {
      logger.error('[fetchTotalRewardsSupply] Error:', error);
      throw error;
    }
    
    const total = data?.reduce((totalSupply, reward) => totalSupply + (reward.supply || 0), 0) || 0;
    
    logQueryPerformance('fetchTotalRewardsSupply', startTime);
    
    // Cache the supply value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(total));
    } catch (e) {
      logger.warn('[fetchTotalRewardsSupply] Could not cache supply:', e);
    }
    
    logger.debug(`[fetchTotalRewardsSupply] Total supply: ${total}`);
    return total;
  } catch (error) {
    logger.error('[fetchTotalRewardsSupply] Fetch failed:', error);
    
    // Try to get cached data
    const cachedSupply = localStorage.getItem(CACHE_KEY);
    if (cachedSupply) {
      logger.debug('[fetchTotalRewardsSupply] Using cached supply data');
      try {
        return JSON.parse(cachedSupply);
      } catch (parseError) {
        logger.error('[fetchTotalRewardsSupply] Error parsing cached supply:', parseError);
      }
    }
    
    return 0;
  }
};
