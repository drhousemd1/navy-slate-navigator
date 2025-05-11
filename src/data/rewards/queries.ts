
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';

// Query keys
export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom-points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

// Fetch functions
export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Reward[];
  } catch (err) {
    console.error('Error fetching rewards:', err);
    return [];
  }
};

export const fetchUserPoints = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single();
      
    if (error || !data) return 0;
    return data.points || 0;
  } catch (err) {
    console.error('Error fetching user points:', err);
    return 0;
  }
};

export const fetchUserDomPoints = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('dom_points')
      .eq('id', user.id)
      .single();
      
    if (error || !data) return 0;
    return data.dom_points || 0;
  } catch (err) {
    console.error('Error fetching user dom points:', err);
    return 0;
  }
};

export const fetchTotalRewardsSupply = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('supply');
      
    if (error || !data) return 0;
    
    return data.reduce((total, reward) => total + (reward.supply || 0), 0);
  } catch (err) {
    console.error('Error fetching total rewards supply:', err);
    return 0;
  }
};
