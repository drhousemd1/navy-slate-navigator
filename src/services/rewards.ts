
import { supabase } from '@/services/api/supabase';
import { 
  Reward, 
  CreateRewardInput, 
  UpdateRewardInput, 
  RewardUsage 
} from '@/types/reward.types';
import { format } from 'date-fns';

// Fetch all rewards for the current user
export const fetchRewards = async (): Promise<Reward[]> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Create a new reward
export const createReward = async (rewardData: CreateRewardInput): Promise<Reward> => {
  const { data, error } = await supabase
    .from('rewards')
    .insert([{ ...rewardData, user_id: (await supabase.auth.getUser()).data.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Update an existing reward
export const updateReward = async ({ id, ...updates }: UpdateRewardInput): Promise<Reward> => {
  const { data, error } = await supabase
    .from('rewards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete a reward
export const deleteReward = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Use/redeem a reward
export const useReward = async (rewardId: string, cost: number): Promise<RewardUsage> => {
  // First, deduct points from user profile
  const user = (await supabase.auth.getUser()).data.user;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single();
  
  if (profileError) throw profileError;
  
  if (profile.points < cost) {
    throw new Error('Insufficient points');
  }
  
  // Update points
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ points: profile.points - cost })
    .eq('id', user.id);
  
  if (updateError) throw updateError;
  
  // Record reward usage
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekNumber = format(today, 'yyyy-ww');
  
  const { data, error } = await supabase
    .from('reward_usages')
    .insert([{
      reward_id: rewardId,
      user_id: user.id,
      day_of_week: dayOfWeek,
      week_number: weekNumber
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  // Reduce reward supply by 1 if it's greater than 0
  const { data: reward } = await supabase
    .from('rewards')
    .select('supply')
    .eq('id', rewardId)
    .single();
  
  if (reward && reward.supply > 0) {
    await supabase
      .from('rewards')
      .update({ supply: reward.supply - 1 })
      .eq('id', rewardId);
  }
  
  return data;
};

// Get user points
export const getUserPoints = async (): Promise<number> => {
  const user = (await supabase.auth.getUser()).data.user;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single();
  
  if (error) throw error;
  return data.points;
};

// Upload a reward image to Supabase Storage
export const uploadRewardImage = async (
  file: File,
  rewardId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${rewardId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('card_images')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('card_images')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
};
