
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon_name?: string;
  icon_color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  supply: number;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  points: number;
  created_at?: string;
  updated_at?: string;
}

// Fetch user's profile information including points
export const fetchUserProfile = async (): Promise<Profile | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      console.error("User not authenticated");
      return null;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data as Profile;
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
    return null;
  }
};

// Fetch all rewards
export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('cost', { ascending: true });
    
    if (error) {
      console.error('Error fetching rewards:', error);
      return [];
    }
    
    return data as Reward[];
  } catch (error) {
    console.error('Unexpected error fetching rewards:', error);
    return [];
  }
};

// Fetch user's rewards
export const fetchUserRewards = async (): Promise<UserReward[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      console.error("User not authenticated");
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', user.user.id);
    
    if (error) {
      console.error('Error fetching user rewards:', error);
      return [];
    }
    
    return data as UserReward[];
  } catch (error) {
    console.error('Unexpected error fetching user rewards:', error);
    return [];
  }
};

// Buy a reward
export const buyReward = async (reward: Reward): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      console.error("User not authenticated");
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to buy rewards',
        variant: 'destructive',
      });
      return false;
    }
    
    // Get user profile to check points
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      toast({
        title: 'Error',
        description: 'Could not fetch user profile',
        variant: 'destructive',
      });
      return false;
    }
    
    const profile = profileData as Profile;
    
    // Check if user has enough points
    if (profile.points < reward.cost) {
      toast({
        title: 'Not Enough Points',
        description: `You need ${reward.cost} points to buy this reward. You have ${profile.points} points.`,
        variant: 'destructive',
      });
      return false;
    }
    
    // Start a transaction
    const { error: transactionError } = await supabase.rpc('buy_reward', {
      p_user_id: user.user.id,
      p_reward_id: reward.id,
      p_cost: reward.cost
    });
    
    if (transactionError) {
      console.error('Transaction error:', transactionError);
      
      // Fall back to manual transaction if RPC fails
      // Begin by checking if user already has this reward
      const { data: existingUserReward, error: checkError } = await supabase
        .from('user_rewards')
        .select('id, supply')
        .eq('user_id', user.user.id)
        .eq('reward_id', reward.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking existing user reward:', checkError);
        toast({
          title: 'Error',
          description: 'Could not process your purchase',
          variant: 'destructive',
        });
        return false;
      }
      
      // Deduct points from user profile
      const { error: updatePointsError } = await supabase
        .from('profiles')
        .update({ 
          points: profile.points - reward.cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.user.id);
      
      if (updatePointsError) {
        console.error('Error updating points:', updatePointsError);
        toast({
          title: 'Error',
          description: 'Could not update your points',
          variant: 'destructive',
        });
        return false;
      }
      
      if (existingUserReward) {
        // Update existing user reward
        const { error: updateError } = await supabase
          .from('user_rewards')
          .update({ 
            supply: (existingUserReward.supply || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUserReward.id);
        
        if (updateError) {
          console.error('Error updating user reward:', updateError);
          toast({
            title: 'Error',
            description: 'Could not update your reward',
            variant: 'destructive',
          });
          return false;
        }
      } else {
        // Create new user reward
        const { error: insertError } = await supabase
          .from('user_rewards')
          .insert({
            user_id: user.user.id,
            reward_id: reward.id,
            supply: 1
          });
        
        if (insertError) {
          console.error('Error inserting user reward:', insertError);
          toast({
            title: 'Error',
            description: 'Could not add reward to your inventory',
            variant: 'destructive',
          });
          return false;
        }
      }
    }
    
    toast({
      title: 'Reward Purchased',
      description: `You have successfully purchased ${reward.title}`,
    });
    
    return true;
  } catch (error) {
    console.error('Unexpected error buying reward:', error);
    toast({
      title: 'Error',
      description: 'An unexpected error occurred',
      variant: 'destructive',
    });
    return false;
  }
};
