import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { logQueryPerformance, withTimeout } from '@/lib/react-query-config';

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom_points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

export const fetchRewards = async (): Promise<Reward[]> => {
  console.log("[fetchRewards] Starting rewards fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-rewards';
  let cachedRewards: Reward[] | null = null;
  
  // Try to get cached data first for immediate response
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        cachedRewards = JSON.parse(cachedData);
        console.log(`[fetchRewards] Found ${cachedRewards.length} cached rewards`);
      } catch (parseError) {
        console.error('[fetchRewards] Error parsing cached rewards:', parseError);
      }
    }
  } catch (e) {
    console.warn('[fetchRewards] Could not access localStorage:', e);
  }
  
  try {
    // Wrap the database query with a timeout to prevent hanging
    const result = await withTimeout(
      supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false }),
      8000,  // 8 second timeout
      { data: [], error: null }
    );
    
    const { data, error } = result;
    
    if (error) {
      console.error('[fetchRewards] Error:', error);
      // If we have cached data, return it instead of throwing
      if (cachedRewards) {
        console.log('[fetchRewards] Returning cached rewards due to error');
        return cachedRewards;
      }
      throw error;
    }
    
    logQueryPerformance('fetchRewards', startTime, data?.length);
    
    // Store in localStorage as a backup cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
      console.log(`[fetchRewards] Saved ${data?.length || 0} rewards to localStorage cache`);
    } catch (e) {
      console.warn('[fetchRewards] Could not save to localStorage:', e);
    }
    
    // Ensure is_dom_reward is always defined in the returned data
    const rewardsWithDomProperty = data?.map(reward => ({
      ...reward,
      is_dom_reward: reward.is_dom_reward ?? false // Default to false if not present
    })) as Reward[];
    
    return rewardsWithDomProperty || [];
  } catch (error) {
    console.error('[fetchRewards] Fetch failed:', error);
    
    // Return cached data if available instead of throwing
    if (cachedRewards) {
      console.log('[fetchRewards] Returning cached rewards due to error');
      return cachedRewards;
    }
    
    // If no cached data and error, return empty array instead of throwing
    console.log('[fetchRewards] No cached rewards available, returning empty array');
    return [];
  }
};

export const fetchUserPoints = async (): Promise<number> => {
  console.log("[fetchUserPoints] Starting points fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-user-points';
  let cachedPoints: number = 0;
  
  // Try to get cached points first
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      cachedPoints = JSON.parse(cachedData);
      console.log('[fetchUserPoints] Found cached points:', cachedPoints);
    }
  } catch (e) {
    console.warn('[fetchUserPoints] Could not access localStorage for points:', e);
  }
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      console.log("[fetchUserPoints] No user ID found, returning 0 points");
      return 0;
    }
    
    // Wrap the database query with a timeout
    const result = await withTimeout(
      supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .maybeSingle(),
      5000, // 5 second timeout
      { data: { points: cachedPoints }, error: null }
    );
    
    const { data, error } = result;
    
    if (error) {
      console.error('[fetchUserPoints] Error:', error);
      // Return cached points on error
      return cachedPoints;
    }
    
    logQueryPerformance('fetchUserPoints', startTime);
    
    // Cache the points value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data?.points || 0));
      console.log(`[fetchUserPoints] Cached points value: ${data?.points || 0}`);
    } catch (e) {
      console.warn('[fetchUserPoints] Could not cache points:', e);
    }
    
    console.log(`[fetchUserPoints] Retrieved ${data?.points || 0} points`);
    return data?.points || 0;
  } catch (error) {
    console.error('[fetchUserPoints] Fetch failed:', error);
    // Return cached points on error
    return cachedPoints;
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
  let cachedSupply: number = 0;
  
  // Try to get cached supply first
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      cachedSupply = JSON.parse(cachedData);
      console.log('[fetchTotalRewardsSupply] Found cached supply:', cachedSupply);
    }
  } catch (e) {
    console.warn('[fetchTotalRewardsSupply] Could not access localStorage for supply:', e);
  }
  
  try {
    // Wrap the database query with a timeout
    const result = await withTimeout(
      supabase
        .from('rewards')
        .select('supply'),
      5000, // 5 second timeout
      { data: [], error: null }
    );
    
    const { data, error } = result;
    
    if (error) {
      console.error('[fetchTotalRewardsSupply] Error:', error);
      // Return cached supply on error
      return cachedSupply;
    }
    
    const total = data?.reduce((total, reward) => total + reward.supply, 0) || 0;
    
    logQueryPerformance('fetchTotalRewardsSupply', startTime);
    
    // Cache the supply value
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(total));
      console.log(`[fetchTotalRewardsSupply] Cached supply value: ${total}`);
    } catch (e) {
      console.warn('[fetchTotalRewardsSupply] Could not cache supply:', e);
    }
    
    console.log(`[fetchTotalRewardsSupply] Total supply: ${total}`);
    return total;
  } catch (error) {
    console.error('[fetchTotalRewardsSupply] Fetch failed:', error);
    // Return cached supply on error
    return cachedSupply;
  }
};
