
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

// Optimized query with fields selection to reduce data transfer
export const fetchRewards = async (): Promise<Reward[]> => {
  console.log("[fetchRewards] Starting rewards fetch");
  const startTime = performance.now();
  
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false }); // Order by created_at desc to show newest first
  
  const endTime = performance.now();
  console.log(`[fetchRewards] Fetch completed in ${endTime - startTime}ms`);
  
  if (error) {
    console.error('[fetchRewards] Error:', error);
    throw error;
  }
  
  console.log(`[fetchRewards] Retrieved ${data?.length || 0} rewards`);
  return data || [];
};

export const fetchUserPoints = async (): Promise<number> => {
  console.log("[fetchUserPoints] Starting points fetch");
  const startTime = performance.now();
  
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
  
  const endTime = performance.now();
  console.log(`[fetchUserPoints] Fetch completed in ${endTime - startTime}ms`);
  
  if (error) {
    console.error('[fetchUserPoints] Error:', error);
    throw error;
  }
  
  console.log(`[fetchUserPoints] Retrieved ${data?.points || 0} points`);
  return data?.points || 0;
};

export const fetchTotalRewardsSupply = async (): Promise<number> => {
  console.log("[fetchTotalRewardsSupply] Starting supply fetch");
  const startTime = performance.now();
  
  const { data, error } = await supabase
    .from('rewards')
    .select('supply');
  
  const endTime = performance.now();
  console.log(`[fetchTotalRewardsSupply] Fetch completed in ${endTime - startTime}ms`);
  
  if (error) {
    console.error('[fetchTotalRewardsSupply] Error:', error);
    throw error;
  }
  
  const total = data?.reduce((total, reward) => total + reward.supply, 0) || 0;
  console.log(`[fetchTotalRewardsSupply] Total supply: ${total}`);
  return total;
};
