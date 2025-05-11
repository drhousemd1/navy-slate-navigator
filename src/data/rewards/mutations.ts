
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY, REWARDS_QUERY_KEY, REWARDS_SUPPLY_QUERY_KEY } from './queries';

// Define reward mutation functions
export const saveRewardMutation = (queryClient: any, showToast = true) => 
  async (reward: Partial<Reward>): Promise<Reward | null> => {
    try {
      let result: Reward | null = null;
      
      if (reward.id) {
        // Update existing reward
        const { data, error } = await supabase
          .from('rewards')
          .update(reward)
          .eq('id', reward.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data as Reward;
      } else {
        // Create new reward
        const { data, error } = await supabase
          .from('rewards')
          .insert(reward)
          .select()
          .single();
          
        if (error) throw error;
        result = data as Reward;
      }
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      
      if (showToast) {
        toast({
          title: reward.id ? "Reward Updated" : "Reward Created",
          description: `${reward.title} has been ${reward.id ? "updated" : "created"} successfully.`,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error saving reward:', error);
      
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to save reward. Please try again.",
          variant: "destructive",
        });
      }
      
      throw error;
    }
  };

export const deleteRewardMutation = (queryClient: any, showToast = true) => 
  async (rewardId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);
        
      if (error) throw error;
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      
      if (showToast) {
        toast({
          title: "Reward Deleted",
          description: "The reward has been deleted successfully.",
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting reward:', error);
      
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to delete reward. Please try again.",
          variant: "destructive",
        });
      }
      
      return false;
    }
  };

export const buyRewardMutation = (queryClient: any) => 
  async ({ reward }: { reward: Reward }): Promise<boolean> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Get current points
      const column = reward.is_dom_reward ? 'dom_points' : 'points';
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(column)
        .eq('id', user.id)
        .single();
        
      if (profileError || !profileData) throw profileError;
      
      const currentPoints = reward.is_dom_reward ? 
        (profileData.dom_points || 0) : 
        (profileData.points || 0);
      
      // Check if enough points
      if (currentPoints < reward.cost) {
        toast({
          title: "Not Enough Points",
          description: `You need ${reward.cost} ${reward.is_dom_reward ? "dom " : ""}points to buy this reward.`,
          variant: "destructive",
        });
        return false;
      }
      
      // Deduct points
      const newPoints = currentPoints - reward.cost;
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ [column]: newPoints })
        .eq('id', user.id);
        
      if (pointsError) throw pointsError;
      
      // Update reward supply
      const { error: rewardError } = await supabase
        .from('rewards')
        .update({ supply: reward.supply + 1 })
        .eq('id', reward.id);
        
      if (rewardError) throw rewardError;
      
      // Update cache
      const pointsKey = reward.is_dom_reward ? REWARDS_DOM_POINTS_QUERY_KEY : REWARDS_POINTS_QUERY_KEY;
      queryClient.invalidateQueries({ queryKey: pointsKey });
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      
      toast({
        title: "Reward Purchased",
        description: `You purchased ${reward.title}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error buying reward:', error);
      
      toast({
        title: "Error",
        description: "Failed to purchase reward. Please try again.",
        variant: "destructive",
      });
      
      return false;
    }
  };

export const useRewardMutation = (queryClient: any) => 
  async (reward: Reward): Promise<boolean> => {
    try {
      if (reward.supply <= 0) {
        toast({
          title: "Cannot Use Reward",
          description: "You don't have any of this reward to use.",
          variant: "destructive",
        });
        return false;
      }
      
      // Update reward supply
      const { error: rewardError } = await supabase
        .from('rewards')
        .update({ supply: reward.supply - 1 })
        .eq('id', reward.id);
        
      if (rewardError) throw rewardError;
      
      // Record usage
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
      
      const { error: usageError } = await supabase
        .from('reward_usage')
        .insert({
          reward_id: reward.id,
          day_of_week: dayOfWeek,
          week_number: weekNumber,
          used: true,
          created_at: today.toISOString()
        });
        
      if (usageError) console.error("Error recording reward usage:", usageError);
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
      
      toast({
        title: "Reward Used",
        description: `You used ${reward.title}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error using reward:', error);
      
      toast({
        title: "Error",
        description: "Failed to use reward. Please try again.",
        variant: "destructive",
      });
      
      return false;
    }
  };

export const updateUserPointsMutation = (queryClient: any) => 
  async (points: number): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('profiles')
        .update({ points })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      
      return true;
    } catch (error) {
      console.error('Error updating user points:', error);
      return false;
    }
  };
