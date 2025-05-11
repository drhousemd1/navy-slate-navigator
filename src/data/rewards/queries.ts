
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';

export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom-points'];
export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching rewards:', error);
    throw error;
  }

  return data || [];
}

export async function fetchUserPoints(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single();
    
  if (error || !data) return 0;
  return data.points || 0;
}

export async function fetchUserDomPoints(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('dom_points')
    .eq('id', user.id)
    .single();
    
  if (error || !data) return 0;
  return data.dom_points || 0;
}

export async function fetchTotalRewardsSupply(): Promise<number> {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply');

  if (error) {
    console.error('Error fetching rewards supply:', error);
    throw error;
  }

  return data?.reduce((total, reward) => total + (reward.supply || 0), 0) || 0;
}
