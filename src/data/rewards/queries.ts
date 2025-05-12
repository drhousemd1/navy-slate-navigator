
// Query keys for rewards-related data
import { supabase } from '@/integrations/supabase/client';

// General keys
export const REWARDS_QUERY_KEY = ['rewards'];

// Points-related keys
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_DOM_POINTS_QUERY_KEY = ['rewards', 'dom_points'];

// Supply totals keys
export const TOTAL_REWARDS_SUPPLY_QUERY_KEY = ['totalRewardsSupply'];
export const TOTAL_DOM_REWARDS_SUPPLY_QUERY_KEY = ['totalDomRewardsSupply'];

// For backward compatibility
export const REWARDS_SUPPLY_QUERY_KEY = TOTAL_REWARDS_SUPPLY_QUERY_KEY;

// Fetch functions
export const fetchRewards = async () => {
  const { data, error } = await supabase.from('rewards').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchUserPoints = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return 0;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userData.user.id)
    .single();
  
  if (error) throw error;
  return data?.points || 0;
};

export const fetchUserDomPoints = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return 0;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('dom_points')
    .eq('id', userData.user.id)
    .single();
  
  if (error) throw error;
  return data?.dom_points || 0;
};

export const fetchTotalRewardsSupply = async () => {
  const { data, error } = await supabase.from('rewards').select('supply, is_dom_reward');
  if (error) throw error;
  return data.filter(reward => !reward.is_dom_reward).reduce((total, reward) => total + reward.supply, 0);
};

export const fetchTotalDomRewardsSupply = async () => {
  const { data, error } = await supabase.from('rewards').select('supply, is_dom_reward');
  if (error) throw error;
  return data.filter(reward => reward.is_dom_reward).reduce((total, reward) => total + reward.supply, 0);
};
