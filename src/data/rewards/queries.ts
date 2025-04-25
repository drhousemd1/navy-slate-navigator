
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = ['rewards', 'points'];
export const REWARDS_SUPPLY_QUERY_KEY = ['rewards', 'supply'];

export const fetchRewards = async (): Promise<Reward[]> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('id', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const fetchUserPoints = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    return 0;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data?.points || 0;
};

export const fetchTotalRewardsSupply = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('supply');
  
  if (error) throw error;
  return data?.reduce((total, reward) => total + reward.supply, 0) || 0;
};
