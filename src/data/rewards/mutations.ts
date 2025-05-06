import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { Reward } from '@/lib/rewardUtils';
import { BuyRewardParams, SaveRewardParams } from '@/contexts/rewards/rewardTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { REWARDS_QUERY_KEY, REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY, REWARDS_SUPPLY_QUERY_KEY } from './queries';

// This function returns the mutation function for saving a reward, with optional toast
export const saveRewardMutation = (queryClient: QueryClient, showToastMessages = true) => {
  return async ({ rewardData, currentIndex }: SaveRewardParams): Promise<Reward | null> => {
    try {
      if (!rewardData.title) {
        throw new Error("Reward must have a title");
      }

      console.log("Saving reward with data:", JSON.stringify(rewardData));
      console.log("is_dom_reward value in saveRewardMutation:", rewardData.is_dom_reward);

      // Prepare data for saving - update with correct type properties
      const dataToSave = {
        title: rewardData.title,
        description: rewardData.description || '',
        cost: rewardData.cost || 10,
        is_dom_reward: Boolean(rewardData.is_dom_reward ?? false), // Ensure proper boolean conversion with default
        supply: rewardData.supply || 0, 
        icon_name: rewardData.icon_name || null,
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

      console.log("Data being sent to Supabase:", dataToSave);
      console.log("Final is_dom_reward value in data:", dataToSave.is_dom_reward);

      let result: Reward | null = null;
      const startTime = performance.now();

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

        const endTime = performance.now();
        console.log(`[saveRewardMutation] Update operation took ${endTime - startTime}ms`);
        
        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }
        
        // Make sure we have a result before accessing properties
        if (!updatedReward) {
          throw new Error("No data returned from update operation");
        }
        
        // Ensure is_dom_reward is defined in the result
        result = {
          ...updatedReward,
          is_dom_reward: updatedReward?.is_dom_reward ?? false
        } as Reward;
        
        console.log("Updated reward result:", result);
        console.log("Updated reward is_dom_reward:", result?.is_dom_reward);

        // Update the cache
        queryClient.setQueryData(
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

        const endTime = performance.now();
        console.log(`[saveRewardMutation] Insert operation took ${endTime - startTime}ms`);
        
        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }
        
        // Make sure we have a result before accessing properties
        if (!newReward) {
          throw new Error("No data returned from insert operation");
        }
        
        // Ensure is_dom_reward is defined in the result
        result = {
          ...newReward,
          is_dom_reward: newReward?.is_dom_reward ?? false
        } as Reward;
        
        console.log("New reward result:", result);
        console.log("New reward is_dom_reward:", result?.is_dom_reward);

        // Update the cache
        queryClient.setQueryData(
          REWARDS_QUERY_KEY, 
          (oldRewards: Reward[] = []) => {
            return [result as Reward, ...oldRewards];
          }
        );
      }

      // Show success toast
      if (showToastMessages) {
        toast({
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
        toast({
          title: "Error",
          description: `Failed to ${rewardData.id ? 'update' : 'create'} reward. Please try again.`,
          variant: "destructive",
        });
      }
      
      throw error;
    }
  };
};

export const buyRewardMutation = (queryClient: QueryClient) => {
  return async ({ rewardId, cost, isDomReward = false }: BuyRewardParams): Promise<void> => {
    console.log("[buyRewardMutation] Starting with params:", { rewardId, cost, isDomReward });
    const startTime = performance.now();
    
    try {
      // Get current cached state for optimistic updates
      const currentRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
      const rewardToUpdate = currentRewards.find(r => r.id === rewardId);
      
      if (!rewardToUpdate) {
        throw new Error("Reward not found in cache");
      }
      
      // Determine which points field to use based on the reward type
      const pointsQueryKey = isDomReward ? REWARDS_DOM_POINTS_QUERY_KEY : REWARDS_POINTS_QUERY_KEY;
      const currentPoints = queryClient.getQueryData<number>(pointsQueryKey) || 0;
      
      if (currentPoints < cost) {
        throw new Error(`Not enough ${isDomReward ? 'dom ' : ''}points to buy this reward`);
      }
      
      // Apply optimistic updates immediately
      const newPoints = currentPoints - cost;
      queryClient.setQueryData(pointsQueryKey, newPoints);
      
      queryClient.setQueryData(
        REWARDS_QUERY_KEY, 
        currentRewards.map(reward => 
          reward.id === rewardId 
            ? { ...reward, supply: reward.supply + 1 }
            : reward
        )
      );
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Run both updates in parallel for better performance
      const [updatePointsResult, updateSupplyResult] = await Promise.all([
        // Update points
        supabase
          .from('profiles')
          .update({ [isDomReward ? 'dom_points' : 'points']: newPoints })
          .eq('id', userData.user.id),
        
        // Update reward supply
        supabase
          .from('rewards')
          .update({ 
            supply: rewardToUpdate.supply + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', rewardId)
      ]);
      
      if (updatePointsResult.error) {
        throw updatePointsResult.error;
      }
      
      if (updateSupplyResult.error) {
        throw updateSupplyResult.error;
      }
      
      // Update the total supply
      queryClient.setQueryData(
        REWARDS_SUPPLY_QUERY_KEY,
        (oldSupply: number = 0) => oldSupply + 1
      );
      
      const endTime = performance.now();
      console.log(`[buyRewardMutation] Operation completed in ${endTime - startTime}ms`);
    } catch (error) {
      console.error("[buyRewardMutation] Error:", error);
      
      // Revert optimistic updates on error by refetching
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      
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
      queryClient.setQueryData(REWARDS_QUERY_KEY, (old: Reward[] = []) => 
        old.filter(r => r.id !== rewardId)
      );
      
      const endTime = performance.now();
      console.log(`[deleteRewardMutation] Operation completed in ${endTime - startTime}ms`);
      
      if (showToasts) {
        toast({
          title: "Success",
          description: "Reward deleted successfully"
        });
      }
      
      return true;
    } catch (error) {
      console.error("[deleteRewardMutation] Error:", error);
      
      if (showToasts) {
        toast({
          title: "Error",
          description: "Failed to delete reward",
          variant: "destructive"
        });
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
      
      // Fixed catch issue - use Promise.catch properly
      supabase
        .from('reward_usage')
        .insert({
          reward_id: rewardId,
          day_of_week: dayOfWeek,
          used: true,
          week_number: weekNumber
        })
        .then(() => console.log("Reward usage recorded successfully"))
        .catch(error => console.error("Error recording reward usage (non-critical):", error));
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData(REWARDS_QUERY_KEY, (old: Reward[] = []) => 
        old.map(r => {
          if (r.id === rewardId) {
            return { ...r, supply: Math.max(0, r.supply - 1) };
          }
          return r;
        })
      );
      
      const endTime = performance.now();
      console.log(`[useRewardMutation] Operation completed in ${endTime - startTime}ms`);
      
      return true;
    } catch (error) {
      console.error("[useRewardMutation] Error:", error);
      
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : 'Failed to use reward',
        variant: "destructive"
      });
      
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
      
      toast({
        title: "Success",
        description: `Points updated to ${points}`
      });
      
      return true;
    } catch (error) {
      console.error("[updateUserPointsMutation] Error:", error);
      
      toast({
        title: "Error",
        description: "Failed to update points",
        variant: "destructive"
      });
      
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
      
      toast({
        title: "Success",
        description: `Dom points updated to ${domPoints}`
      });
      
      return true;
    } catch (error) {
      console.error("[updateUserDomPointsMutation] Error:", error);
      
      toast({
        title: "Error",
        description: "Failed to update dom points",
        variant: "destructive"
      });
      
      throw error;
    }
  };
