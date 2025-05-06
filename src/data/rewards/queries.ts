
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { logQueryPerformance } from '@/lib/react-query-config';

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom_points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

export const fetchRewards = async (): Promise<Reward[]> => {
  console.log("[fetchRewards] Starting rewards fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-rewards';
  
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[fetchRewards] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchRewards', startTime, data?.length);
    
    // Store in localStorage as a backup cache with version information
    try {
      const cacheData = {
        version: parseInt(localStorage.getItem('app-data-version') || '0'),
        timestamp: Date.now(),
        data: data || []
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[fetchRewards] Saved ${data?.length || 0} rewards to localStorage cache with version ${cacheData.version}`);
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
    
    // Try to get cached data from localStorage with version check
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('[fetchRewards] Attempting to use cached rewards data');
      try {
        const cacheObject = JSON.parse(cachedData);
        const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
        const cacheVersion = cacheObject.version || 0;
        const cacheAge = Date.now() - (cacheObject.timestamp || 0);
        const maxCacheAge = 1000 * 60 * 30; // 30 minutes
        
        if (cacheVersion === currentVersion && cacheAge < maxCacheAge) {
          // Cache is valid, use it
          console.log(`[fetchRewards] Using valid cached data (version ${cacheVersion}, age ${cacheAge}ms)`);
          
          // Ensure is_dom_reward is defined for cached data too
          const cachedWithDomProperty = cacheObject.data.map((reward: any) => ({
            ...reward,
            is_dom_reward: reward.is_dom_reward ?? false
          })) as Reward[];
          
          return cachedWithDomProperty;
        } else {
          console.log(`[fetchRewards] Cached data invalid or outdated: cache=${cacheVersion}, current=${currentVersion}, age=${cacheAge}ms`);
          throw error; // Rethrow to trigger refetch
        }
      } catch (parseError) {
        console.error('[fetchRewards] Error parsing cached data:', parseError);
      }
    }
    
    throw error;
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
    
    // Cache the points value with version information
    try {
      const cacheData = {
        version: parseInt(localStorage.getItem('app-data-version') || '0'),
        timestamp: Date.now(),
        points: data?.points || 0
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[fetchUserPoints] Cached ${cacheData.points} points with version ${cacheData.version}`);
    } catch (e) {
      console.warn('[fetchUserPoints] Could not cache points:', e);
    }
    
    console.log(`[fetchUserPoints] Retrieved ${data?.points || 0} points`);
    return data?.points || 0;
  } catch (error) {
    console.error('[fetchUserPoints] Fetch failed:', error);
    
    // Try to get cached data with version check
    const cachedPointsData = localStorage.getItem(CACHE_KEY);
    if (cachedPointsData) {
      try {
        const cacheObject = JSON.parse(cachedPointsData);
        const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
        const cacheVersion = cacheObject.version || 0;
        const cacheAge = Date.now() - (cacheObject.timestamp || 0);
        const maxCacheAge = 1000 * 60 * 30; // 30 minutes
        
        if (cacheVersion === currentVersion && cacheAge < maxCacheAge) {
          // Cache is valid, use it
          console.log(`[fetchUserPoints] Using valid cached points: ${cacheObject.points} (version ${cacheVersion}, age ${cacheAge}ms)`);
          return cacheObject.points;
        } else {
          console.log(`[fetchUserPoints] Cached points outdated: cache=${cacheVersion}, current=${currentVersion}, age=${cacheAge}ms`);
        }
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
    
    // Cache the dom points value with version information
    try {
      const cacheData = {
        version: parseInt(localStorage.getItem('app-data-version') || '0'),
        timestamp: Date.now(),
        dom_points: data?.dom_points || 0
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[fetchUserDomPoints] Cached ${cacheData.dom_points} dom points with version ${cacheData.version}`);
    } catch (e) {
      console.warn('[fetchUserDomPoints] Could not cache dom points:', e);
    }
    
    console.log(`[fetchUserDomPoints] Retrieved ${data?.dom_points || 0} dom points`);
    return data?.dom_points || 0;
  } catch (error) {
    console.error('[fetchUserDomPoints] Fetch failed:', error);
    
    // Try to get cached data with version check
    const cachedDomPointsData = localStorage.getItem(CACHE_KEY);
    if (cachedDomPointsData) {
      try {
        const cacheObject = JSON.parse(cachedDomPointsData);
        const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
        const cacheVersion = cacheObject.version || 0;
        const cacheAge = Date.now() - (cacheObject.timestamp || 0);
        const maxCacheAge = 1000 * 60 * 30; // 30 minutes
        
        if (cacheVersion === currentVersion && cacheAge < maxCacheAge) {
          // Cache is valid, use it
          console.log(`[fetchUserDomPoints] Using valid cached dom points: ${cacheObject.dom_points} (version ${cacheVersion}, age ${cacheAge}ms)`);
          return cacheObject.dom_points;
        } else {
          console.log(`[fetchUserDomPoints] Cached dom points outdated: cache=${cacheVersion}, current=${currentVersion}, age=${cacheAge}ms`);
        }
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
    
    // Cache the supply value with version information
    try {
      const cacheData = {
        version: parseInt(localStorage.getItem('app-data-version') || '0'),
        timestamp: Date.now(),
        supply: total
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`[fetchTotalRewardsSupply] Cached total supply: ${total} with version ${cacheData.version}`);
    } catch (e) {
      console.warn('[fetchTotalRewardsSupply] Could not cache supply:', e);
    }
    
    console.log(`[fetchTotalRewardsSupply] Total supply: ${total}`);
    return total;
  } catch (error) {
    console.error('[fetchTotalRewardsSupply] Fetch failed:', error);
    
    // Try to get cached data with version check
    const cachedSupplyData = localStorage.getItem(CACHE_KEY);
    if (cachedSupplyData) {
      try {
        const cacheObject = JSON.parse(cachedSupplyData);
        const currentVersion = parseInt(localStorage.getItem('app-data-version') || '0');
        const cacheVersion = cacheObject.version || 0;
        const cacheAge = Date.now() - (cacheObject.timestamp || 0);
        const maxCacheAge = 1000 * 60 * 30; // 30 minutes
        
        if (cacheVersion === currentVersion && cacheAge < maxCacheAge) {
          // Cache is valid, use it
          console.log(`[fetchTotalRewardsSupply] Using valid cached supply: ${cacheObject.supply} (version ${cacheVersion}, age ${cacheAge}ms)`);
          return cacheObject.supply;
        } else {
          console.log(`[fetchTotalRewardsSupply] Cached supply outdated: cache=${cacheVersion}, current=${currentVersion}, age=${cacheAge}ms`);
        }
      } catch (parseError) {
        console.error('[fetchTotalRewardsSupply] Error parsing cached supply:', parseError);
      }
    }
    
    return 0;
  }
};
