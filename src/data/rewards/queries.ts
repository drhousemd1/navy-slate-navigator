
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { logQueryPerformance } from '@/lib/react-query-config';

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom_points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

// Add timeout to Supabase queries
const SUPABASE_TIMEOUT_MS = 5000; // 5 seconds timeout

export const fetchRewards = async (): Promise<Reward[]> => {
  console.log("[fetchRewards] Starting rewards fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-rewards';
  
  try {
    // Create a promise race between the Supabase query and a timeout
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase fetch timed out')), SUPABASE_TIMEOUT_MS);
    });

    const fetchPromise = supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false })
      .then(response => {
        if (response.error) throw response.error;
        return response.data;
      });
    
    // Race between the fetch and timeout
    const data = await Promise.race([fetchPromise, timeoutPromise]) as Reward[] | null;
    
    if (!data) throw new Error('No data returned from Supabase');
    
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
    
    return rewardsWithDomProperty;
  } catch (error) {
    console.error('[fetchRewards] Fetch failed:', error);
    
    // Try to get cached data from localStorage
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('[fetchRewards] Using cached rewards data');
      try {
        const parsedData = JSON.parse(cachedData);
        // Ensure is_dom_reward is defined for cached data too
        const cachedWithDomProperty = parsedData.map((reward: any) => ({
          ...reward,
          is_dom_reward: reward.is_dom_reward ?? false
        })) as Reward[];
        return cachedWithDomProperty;
      } catch (parseError) {
        console.error('[fetchRewards] Error parsing cached data:', parseError);
      }
    }
    
    // Return empty array as last resort to prevent crashes
    return [];
  }
};

export const fetchUserPoints = async (): Promise<number> => {
  console.log("[fetchUserPoints] Starting points fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-user-points';
  
  try {
    // Create a promise race between the Supabase query and a timeout
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase fetch timed out')), SUPABASE_TIMEOUT_MS);
    });

    const fetchUser = supabase.auth.getUser().then(response => {
      if (response.error) throw response.error;
      return response.data.user?.id;
    });
    
    const userId = await Promise.race([fetchUser, timeoutPromise]);
    
    if (!userId) {
      console.log("[fetchUserPoints] No user ID found, returning 0 points");
      return 0;
    }
    
    const fetchPoints = supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()
      .then(response => {
        if (response.error) throw response.error;
        return response.data;
      });
      
    const data = await Promise.race([fetchPoints, timeoutPromise]);
    
    if (!data) throw new Error('No data returned from Supabase');
    
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
    // Create a promise race between the Supabase query and a timeout
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase fetch timed out')), SUPABASE_TIMEOUT_MS);
    });

    const fetchUser = supabase.auth.getUser().then(response => {
      if (response.error) throw response.error;
      return response.data.user?.id;
    });
    
    const userId = await Promise.race([fetchUser, timeoutPromise]);
    
    if (!userId) {
      console.log("[fetchUserDomPoints] No user ID found, returning 0 dom points");
      return 0;
    }
    
    const fetchDomPoints = supabase
      .from('profiles')
      .select('dom_points')
      .eq('id', userId)
      .single()
      .then(response => {
        if (response.error) throw response.error;
        return response.data;
      });
      
    const data = await Promise.race([fetchDomPoints, timeoutPromise]);
    
    if (!data) throw new Error('No data returned from Supabase');
    
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
    // Create a promise race between the Supabase query and a timeout
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase fetch timed out')), SUPABASE_TIMEOUT_MS);
    });

    const fetchSupply = supabase
      .from('rewards')
      .select('supply')
      .then(response => {
        if (response.error) throw response.error;
        return response.data;
      });
      
    const data = await Promise.race([fetchSupply, timeoutPromise]);
    
    if (!data) throw new Error('No data returned from Supabase');
    
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
