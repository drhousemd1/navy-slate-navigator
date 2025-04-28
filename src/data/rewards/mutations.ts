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
        // Get current data for optimistic update
        const currentRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
        const currentReward = currentRewards.find(r => r.id === rewardData.id);
        
        if (!currentReward) throw new Error("Reward not found in cache");
        
        // Create optimistic update
        const optimisticReward = {
          ...currentReward,
          ...rewardData,
          updated_at: new Date().toISOString()
        };
        
        // Update cache immediately
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
          old.map(r => r.id === rewardData.id ? optimisticReward : r)
        );
        
        // Make the actual API call
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
        
        // Update cache with actual server data
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
          old.map(r => r.id === result.id ? result : r)
        );
      } else {
        // Create new reward - generate temp ID for optimistic update
        const tempId = `temp-${Date.now()}`;
        
        // Create new reward data
        const newReward = {
          id: tempId as string,
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
          focal_point_y: rewardData.focal_point_y || 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Reward;
        
        // Add to cache immediately
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
          [newReward, ...old]
        );
        
        // Create actual reward in database
        const { data, error } = await supabase
          .from('rewards')
          .insert({
            title: newReward.title,
            description: newReward.description,
            cost: newReward.cost,
            supply: newReward.supply,
            background_image_url: newReward.background_image_url,
            background_opacity: newReward.background_opacity,
            icon_name: newReward.icon_name,
            icon_color: newReward.icon_color,
            title_color: newReward.title_color,
            subtext_color: newReward.subtext_color,
            calendar_color: newReward.calendar_color,
            highlight_effect: newReward.highlight_effect,
            focal_point_x: newReward.focal_point_x,
            focal_point_y: newReward.focal_point_y
          })
          .select('*')
          .single();
          
        if (error) throw error;
        result = data;
        
        // Replace optimistic reward with actual one
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
          old.map(r => r.id === tempId ? result : r)
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
      
      // Remove the optimistic update in case of error
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.filter(r => !r.id.toString().startsWith('temp-'))
      );
      
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
      // Get current points and reward data for optimistic updates
      const currentPoints = queryClient.getQueryData<number>(REWARDS_POINTS_QUERY_KEY) || 0;
      const rewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
      const reward = rewards.find(r => r.id === rewardId);
      
      if (!reward) throw new Error('Reward not found in cache');
      
      // Check if we have enough points locally (to fail fast)
      if (currentPoints < cost) {
        throw new Error('Not enough points to buy this reward');
      }
      
      // Apply optimistic updates
      const newPoints = currentPoints - cost;
      const updatedReward = { ...reward, supply: reward.supply + 1 };
      
      // Update points in cache
      queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, newPoints);
      
      // Update reward in cache
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => 
        old.map(r => r.id === rewardId ? updatedReward : r)
      );
      
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
      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .select('supply, title')
        .eq('id', rewardId)
        .single();
      
      if (rewardError) throw rewardError;
      
      // Start transaction-like operations
      // First, deduct points
      const serverNewPoints = userPoints.points - cost;
      const { error: updatePointsError } = await supabase
        .from('profiles')
        .update({ points: serverNewPoints })
        .eq('id', userId);
      
      if (updatePointsError) throw updatePointsError;
      
      // Then, increment reward supply
      const { error: updateSupplyError } = await supabase
        .from('rewards')
        .update({ 
          supply: rewardData.supply + 1,
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
      
      const endTime = performance.now();
      console.log(`[buyRewardMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", `You purchased ${rewardData.title || 'a reward'}`);
      
      return { success: true, newPoints: serverNewPoints };
    } catch (error) {
      console.error("[buyRewardMutation] Error:", error);
      
      // Revert cache on error
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      
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
