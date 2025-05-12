
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { logQueryPerformance } from '@/lib/react-query-config';
import { saveRewardsToDB } from '@/data/indexedDB/useIndexedDB';

// Query keys with version
const CACHE_VERSION = 'v2';
export const REWARDS_QUERY_KEY = [`${CACHE_VERSION}_rewards`];
export const REWARDS_POINTS_QUERY_KEY = [`${CACHE_VERSION}_rewards`, 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = [`${CACHE_VERSION}_rewards`, 'dom-points'];
export const REWARDS_SUPPLY_QUERY_KEY = [`${CACHE_VERSION}_rewards`, 'supply'];

// Fetch functions
export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    const startTime = performance.now();
    console.log("[fetchRewards] Starting rewards fetch");
    
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Cache data in IndexedDB
    if (data) {
      await saveRewardsToDB(data as Reward[]);
    }
    
    logQueryPerformance('fetchRewards', startTime, data?.length);
    return data as Reward[];
  } catch (err) {
    console.error('Error fetching rewards:', err);
    return [];
  }
};

export const fetchUserPoints = async (): Promise<number> => {
  try {
    const startTime = performance.now();
    console.log("[fetchUserPoints] Starting points fetch");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single();
      
    if (error || !data) return 0;
    
    logQueryPerformance('fetchUserPoints', startTime);
    return data.points || 0;
  } catch (err) {
    console.error('Error fetching user points:', err);
    return 0;
  }
};

export const fetchUserDomPoints = async (): Promise<number> => {
  try {
    const startTime = performance.now();
    console.log("[fetchUserDomPoints] Starting dom points fetch");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('dom_points')
      .eq('id', user.id)
      .single();
      
    if (error || !data) return 0;
    
    logQueryPerformance('fetchUserDomPoints', startTime);
    return data.dom_points || 0;
  } catch (err) {
    console.error('Error fetching user dom points:', err);
    return 0;
  }
};

export const fetchTotalRewardsSupply = async (): Promise<number> => {
  try {
    const startTime = performance.now();
    console.log("[fetchTotalRewardsSupply] Starting supply fetch");
    
    const { data, error } = await supabase
      .from('rewards')
      .select('supply');
      
    if (error || !data) return 0;
    
    const total = data.reduce((total, reward) => total + (reward.supply || 0), 0);
    logQueryPerformance('fetchTotalRewardsSupply', startTime);
    return total;
  } catch (err) {
    console.error('Error fetching total rewards supply:', err);
    return 0;
  }
};
