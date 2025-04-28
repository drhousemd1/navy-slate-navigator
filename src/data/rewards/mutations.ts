
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { Reward } from '@/lib/rewardUtils';
import { REWARDS_QUERY_KEY, REWARDS_POINTS_QUERY_KEY, REWARDS_SUPPLY_QUERY_KEY } from './queries';

// Helper for consistent toast handling
const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
  toast({
    title,
    description,
    variant,
  });
};

export const saveRewardMutation = (queryClient: QueryClient, showToasts: boolean = true) => 
  async (params: { rewardData: Partial<Reward>; currentIndex?: number | null }): Promise<Reward> => {
    const { rewardData } = params;
    console.log("[saveRewardMutation] Saving reward:", rewardData);
    const startTime = performance.now();
    
    try {
      let result: Reward;
      
      // Handle optimistic updates before the actual API call
      if (rewardData.id) {
        // Update existing reward
        const { data, error } = await supabase
          .from('rewards')
          .update({
            title: rewardData.title,
            description: rewardData.description,
            cost: rewardData.cost,
            supply: rewardData.supply,
            background_image_url: rewardData.background_image_url,
            background_opacity: rewardData.background_opacity,
            icon_name: rewardData.icon_name,
            icon_color: rewardData.icon_color,
            title_color: rewardData.title_color,
            subtext_color: rewardData.subtext_color,
            calendar_color: rewardData.calendar_color,
            highlight_effect: rewardData.highlight_effect,
            focal_point_x: rewardData.focal_point_x,
            focal_point_y: rewardData.focal_point_y,
            updated_at: new Date().toISOString()
          })
          .eq('id', rewardData.id)
          .select('*')
          .single();
          
        if (error) throw error;
        result = data;
        
        // Update the cache directly for better UX
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
          old.map(r => r.id === result.id ? result : r)
        );
      } else {
        // Create new reward
        const newReward = {
          title: rewardData.title || 'New Reward',
          description: rewardData.description || '',
          cost: rewardData.cost || 10,
          supply: rewardData.supply || 0,
          background_image_url: rewardData.background_image_url,
          background_opacity: rewardData.background_opacity || 100,
          icon_name: rewardData.icon_name,
          icon_color: rewardData.icon_color || '#9b87f5',
          title_color: rewardData.title_color || '#FFFFFF',
          subtext_color: rewardData.subtext_color || '#8E9196',
          calendar_color: rewardData.calendar_color || '#7E69AB',
          highlight_effect: rewardData.highlight_effect || false,
          focal_point_x: rewardData.focal_point_x || 50,
          focal_point_y: rewardData.focal_point_y || 50
        };
        
        const { data, error } = await supabase
          .from('rewards')
          .insert(newReward)
          .select('*')
          .single();
          
        if (error) throw error;
        result = data;
        
        // Update cache to include the new reward
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
          [result, ...old]
        );
      }
      
      const endTime = performance.now();
      console.log(`[saveRewardMutation] Operation completed in ${endTime - startTime}ms`);
      
      if (showToasts) {
        showToast("Success", "Reward saved successfully");
      }
      
      return result;
    } catch (error) {
      console.error("[saveRewardMutation] Error:", error);
      
      if (showToasts) {
        showToast("Error", "Failed to save reward. Please try again.", "destructive");
      }
      
      throw error;
    }
  };

export const buyRewardMutation = (queryClient: QueryClient) => 
  async ({ rewardId, cost }: { rewardId: string, cost: number }): Promise<{ success: boolean, newPoints: number }> => {
    console.log("[buyRewardMutation] Buying reward:", { rewardId, cost });
    const startTime = performance.now();
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error('User is not logged in');
      }
      
      // First, check user points
      const { data: userPoints, error: pointsError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();
      
      if (pointsError) throw pointsError;
      
      if (!userPoints || userPoints.points < cost) {
        throw new Error('Not enough points to buy this reward');
      }
      
      // Then, check if reward is available
      const { data: reward, error: rewardError } = await supabase
        .from('rewards')
        .select('supply, title')
        .eq('id', rewardId)
        .single();
      
      if (rewardError) throw rewardError;
      
      // Start transaction-like operations
      // First, deduct points
      const newPoints = userPoints.points - cost;
      const { error: updatePointsError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userId);
      
      if (updatePointsError) throw updatePointsError;
      
      // Then, increment reward supply
      const { error: updateSupplyError } = await supabase
        .from('rewards')
        .update({ 
          supply: reward.supply + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', rewardId);
      
      if (updateSupplyError) {
        // Try to revert the points update on error
        await supabase
          .from('profiles')
          .update({ points: userPoints.points })
          .eq('id', userId);
        throw updateSupplyError;
      }
      
      // Record usage
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
      
      await supabase
        .from('reward_usage')
        .insert({
          reward_id: rewardId,
          day_of_week: dayOfWeek,
          used: false, // It's not used yet, just bought
          week_number: weekNumber
        });
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData<number>(REWARDS_POINTS_QUERY_KEY, newPoints);
      
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
        old.map(r => {
          if (r.id === rewardId) {
            return { ...r, supply: r.supply + 1 };
          }
          return r;
        })
      );
      
      const endTime = performance.now();
      console.log(`[buyRewardMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", `You purchased ${reward.title || 'a reward'}`);
      
      return { success: true, newPoints };
    } catch (error) {
      console.error("[buyRewardMutation] Error:", error);
      
      showToast(
        "Error", 
        error instanceof Error ? error.message : 'Failed to buy reward',
        "destructive"
      );
      
      throw error;
    }
  };

export const deleteRewardMutation = (queryClient: QueryClient, showToasts: boolean = true) => 
  async (rewardId: string): Promise<boolean> => {
    console.log("[deleteRewardMutation] Deleting reward:", rewardId);
    const startTime = performance.now();
    
    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      if (error) throw error;
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
        old.filter(r => r.id !== rewardId)
      );
      
      const endTime = performance.now();
      console.log(`[deleteRewardMutation] Operation completed in ${endTime - startTime}ms`);
      
      if (showToasts) {
        showToast("Success", "Reward deleted successfully");
      }
      
      return true;
    } catch (error) {
      console.error("[deleteRewardMutation] Error:", error);
      
      if (showToasts) {
        showToast("Error", "Failed to delete reward", "destructive");
      }
      
      throw error;
    }
  };

export const useRewardMutation = (queryClient: QueryClient) => 
  async (rewardId: string): Promise<boolean> => {
    console.log("[useRewardMutation] Using reward:", rewardId);
    const startTime = performance.now();
    
    try {
      // Get the reward first to check supply
      const { data: reward, error: rewardError } = await supabase
        .from('rewards')
        .select('supply, title')
        .eq('id', rewardId)
        .single();
      
      if (rewardError) throw rewardError;
      
      if (reward.supply <= 0) {
        throw new Error('No rewards available to use');
      }
      
      // Update reward supply
      const { error } = await supabase
        .from('rewards')
        .update({ 
          supply: reward.supply - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', rewardId);
      
      if (error) throw error;
      
      // Record usage
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
      
      await supabase
        .from('reward_usage')
        .insert({
          reward_id: rewardId,
          day_of_week: dayOfWeek,
          used: true,
          week_number: weekNumber
        });
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
        old.map(r => {
          if (r.id === rewardId) {
            return { ...r, supply: Math.max(0, r.supply - 1) };
          }
          return r;
        })
      );
      
      const endTime = performance.now();
      console.log(`[useRewardMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", `You used ${reward.title || 'a reward'}`);
      
      return true;
    } catch (error) {
      console.error("[useRewardMutation] Error:", error);
      
      showToast(
        "Error", 
        error instanceof Error ? error.message : 'Failed to use reward',
        "destructive"
      );
      
      throw error;
    }
  };

export const updateUserPointsMutation = (queryClient: QueryClient) => 
  async (points: number): Promise<boolean> => {
    console.log("[updateUserPointsMutation] Updating points:", points);
    const startTime = performance.now();
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error('User is not logged in');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ points })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, points);
      
      const endTime = performance.now();
      console.log(`[updateUserPointsMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", `Points updated to ${points}`);
      
      return true;
    } catch (error) {
      console.error("[updateUserPointsMutation] Error:", error);
      
      showToast("Error", "Failed to update points", "destructive");
      
      throw error;
    }
  };
