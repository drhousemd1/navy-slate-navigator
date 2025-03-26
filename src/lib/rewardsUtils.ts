
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Define types for reward data
export interface Reward {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  icon_name: string | null;
  icon_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserReward {
  id: string;
  reward_id: string;
  user_id: string;
  supply: number;
  created_at: string;
  updated_at: string;
  reward?: Reward;
}

// Fetch rewards from the database
export async function fetchRewards() {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching rewards: ${error.message}`);
  }

  return data as Reward[];
}

// Fetch user rewards from the database
export async function fetchUserRewards(userId: string) {
  const { data, error } = await supabase
    .from('user_rewards')
    .select(`
      *,
      reward:reward_id(*)
    `)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error fetching user rewards: ${error.message}`);
  }

  return data as UserReward[];
}

// Get user profile to check points
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Error fetching user profile: ${error.message}`);
  }

  return data;
}

// Check if user has enough points for a reward
export function hasEnoughPoints(userPoints: number, rewardCost: number): boolean {
  return userPoints >= rewardCost;
}

// Purchase a reward
export async function purchaseReward(userId: string, rewardId: string, cost: number) {
  // Define the type for the parameters explicitly
  interface PurchaseRewardParams {
    user_id: string;
    reward_id: string;
    cost: number;
  }

  // Define the return type for the RPC function
  interface PurchaseRewardResult {
    success: boolean;
  }

  // Fix: Use the correct typing for supabase.rpc to avoid the 'never' constraint error
  const { data, error } = await supabase.rpc(
    'purchase_reward', 
    { 
      user_id: userId, 
      reward_id: rewardId, 
      cost 
    }
  );

  if (error) {
    throw new Error(`Error purchasing reward: ${error.message}`);
  }

  return data;
}

// Use a reward
export async function useReward(userRewardId: string) {
  // Get the user reward to check supply
  const { data: userReward, error: getUserRewardError } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('id', userRewardId)
    .single();

  if (getUserRewardError) {
    throw new Error(`Error fetching user reward: ${getUserRewardError.message}`);
  }

  if (!userReward || userReward.supply <= 0) {
    throw new Error('No supply available for this reward');
  }

  // Update the supply
  const { data, error } = await supabase
    .from('user_rewards')
    .update({ supply: userReward.supply - 1 })
    .eq('id', userRewardId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error using reward: ${error.message}`);
  }

  return data;
}

// Format rewards for display
export function formatRewardsForDisplay(rewards: Reward[], userRewards: UserReward[] = []) {
  // Create a map of reward IDs to user rewards
  const userRewardMap = new Map<string, UserReward>();
  userRewards.forEach(userReward => {
    userRewardMap.set(userReward.reward_id, userReward);
  });

  // Format rewards for display
  return rewards.map(reward => {
    const userReward = userRewardMap.get(reward.id);
    return {
      id: reward.id,
      title: reward.title,
      description: reward.description || '',
      cost: reward.cost,
      supply: userReward ? userReward.supply : 0,
      iconName: reward.icon_name || 'Gift',
      iconColor: reward.icon_color || '#9b87f5',
      userRewardId: userReward ? userReward.id : null
    };
  });
}
