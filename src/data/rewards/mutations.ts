import { queryClient } from "@/lib/react-query-config";
import { Reward } from '@/lib/rewardUtils';
import { BuyRewardParams, SaveRewardParams } from '@/contexts/rewards/rewardTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast as showToast } from '@/hooks/use-toast';
import { REWARDS_QUERY_KEY, REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY, REWARDS_SUPPLY_QUERY_KEY } from './queries';

// This function returns the mutation function for saving a reward, with optional toast
export const saveRewardMutation = (queryClient: any, showToastMessages = true) => {
  return async ({ rewardData, currentIndex }: SaveRewardParams): Promise<Reward | null> => {
    try {
      if (!rewardData.title) {
        throw new Error("Reward must have a title");
      }

      // Prepare data for saving
      const dataToSave = {
        title: rewardData.title,
        description: rewardData.description || '',
        cost: rewardData.cost || 10,
        is_dom_reward: rewardData.is_dom_reward || false, // Add this field
        supply: rewardData.supply || 0,
        icon_name: rewardData.icon_name,
        icon_color: rewardData.icon_color || '#9b87f5',
        background_image_url: rewardData.background_image_url || null,
        background_opacity: rewardData.background_opacity || 100,
        focal_point_x: rewardData.focal_point_x || 50,
        focal_point_y: rewardData.focal_point_y || 50,
        highlight_effect: rewardData.highlight_effect || false,
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
      };

      let result: Reward | null = null;

      if (rewardData.id) {
        // Update existing reward
        const { data: updatedReward, error } = await supabase
          .from('rewards')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', rewardData.id)
          .select('*')
          .single();

        if (error) throw error;
        result = updatedReward;

        // Update the cache
        queryClient.setQueryData<Reward[]>(
          REWARDS_QUERY_KEY, 
          (oldRewards: Reward[] = []) => {
            return oldRewards.map(r => r.id === result?.id ? result : r);
          }
        );
      } else {
        // Create new reward
        const { data: newReward, error } = await supabase
          .from('rewards')
          .insert({
            ...dataToSave,
            supply: 0, // Start with 0 supply
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (error) throw error;
        result = newReward;

        // Update the cache
        queryClient.setQueryData<Reward[]>(
          REWARDS_QUERY_KEY, 
          (oldRewards: Reward[] = []) => {
            return [result as Reward, ...oldRewards];
          }
        );
      }

      // Show success toast
      if (showToastMessages) {
        showToast({
          title: "Success",
          description: `Reward ${rewardData.id ? 'updated' : 'created'} successfully`,
        });
      }

      // Invalidate queries to force refetch
      queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });

      return result;
    } catch (error) {
      console.error("Error saving reward:", error);
      
      if (showToastMessages) {
        showToast({
          title: "Error",
          description: `Failed to ${rewardData.id ? 'update' : 'create'} reward. Please try again.`,
          variant: "destructive",
        });
      }
      
      throw error;
    }
  };
};

export const buyRewardMutation = (queryClient: any) => {
  return async ({ rewardId, cost, isDomReward = false }: BuyRewardParams): Promise<void> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Get the reward to confirm it exists
      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .select('id, title, supply')
        .eq('id', rewardId)
        .single();
        
      if (rewardError || !rewardData) {
        throw new Error("Reward not found");
      }
      
      // Check which points field to update based on reward type
      const pointsField = isDomReward ? 'dom_points' : 'points';
      
      // First check user's points
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select(`${pointsField}`)
        .eq('id', userData.user.id)
        .single();
        
      if (profileError || !userProfile) {
        throw new Error("User profile not found");
      }
      
      const currentPoints = userProfile[pointsField] || 0;
      
      if (currentPoints < cost) {
        throw new Error(`Not enough ${isDomReward ? 'dom ' : ''}points to buy this reward`);
      }
      
      const newPoints = currentPoints - cost;
      
      // Update points in a transaction-like manner
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [pointsField]: newPoints })
        .eq('id', userData.user.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Update reward supply
      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ 
          supply: rewardData.supply + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', rewardId);
        
      if (supplyError) {
        // Try to revert the points change if updating supply fails
        await supabase
          .from('profiles')
          .update({ [pointsField]: currentPoints })
          .eq('id', userData.user.id);
          
        throw supplyError;
      }
      
      // Update the cache
      if (isDomReward) {
        queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, newPoints);
      } else {
        queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, newPoints);
      }
      
      // Update the rewards cache
      queryClient.setQueryData<Reward[]>(
        REWARDS_QUERY_KEY, 
        (oldRewards: Reward[] = []) => {
          return oldRewards.map(reward => 
            reward.id === rewardId 
              ? { ...reward, supply: reward.supply + 1 }
              : reward
          );
        }
      );
      
      // Update the total supply
      queryClient.setQueryData<number>(
        REWARDS_SUPPLY_QUERY_KEY,
        (oldSupply = 0) => oldSupply + 1
      );
      
      showToast({
        title: "Reward Purchased",
        description: `You purchased "${rewardData.title}"`,
      });
    } catch (error) {
      console.error("Error buying reward:", error);
      
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to buy reward",
        variant: "destructive",
      });
      
      throw error;
    }
  };
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

export const updateUserDomPointsMutation = (queryClient: QueryClient) => 
  async (domPoints: number): Promise<boolean> => {
    console.log("[updateUserDomPointsMutation] Updating dom points:", domPoints);
    const startTime = performance.now();
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error('User is not logged in');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ dom_points: domPoints })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, domPoints);
      
      const endTime = performance.now();
      console.log(`[updateUserDomPointsMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", `Dom points updated to ${domPoints}`);
      
      return true;
    } catch (error) {
      console.error("[updateUserDomPointsMutation] Error:", error);
      
      showToast("Error", "Failed to update dom points", "destructive");
      
      throw error;
    }
  };
