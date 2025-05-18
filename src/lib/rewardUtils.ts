import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Reward } from "@/data/rewards/types"; // Updated import

export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    console.log("[fetchRewards] Fetching rewards");
    
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });
    
    if (error) {
      console.error('[fetchRewards] Error fetching rewards:', error);
      toast({
        title: 'Error fetching rewards',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }

    const rewardsWithDomProperty = data?.map(reward => ({
      ...reward,
      is_dom_reward: reward.is_dom_reward ?? false 
    })) as Reward[];
    
    return rewardsWithDomProperty || [];
  } catch (err) {
    console.error('[fetchRewards] Unexpected error fetching rewards:', err);
    toast({
      title: 'Error fetching rewards',
      description: 'Could not fetch rewards',
      variant: 'destructive',
    });
    return [];
  }
};

// saveReward now expects `is_dom_reward` to be explicitly passed for new rewards.
// For updates, it's part of the partial Reward data.
export const saveReward = async (reward: Partial<Reward> & { title: string, cost?: number, supply?: number, is_dom_reward?: boolean }, existingId?: string): Promise<Reward | null> => {
  try {
    const startTime = performance.now();
    
    if (existingId) {
      const { created_at, updated_at, id, ...cleanRewardData } = reward; // id is part of reward but not needed in cleanRewardData for update
      // Ensure is_dom_reward is boolean if provided, otherwise it won't be updated.
      const updatePayload: Partial<Reward> = { ...cleanRewardData };
      if (typeof cleanRewardData.is_dom_reward === 'boolean') {
        updatePayload.is_dom_reward = cleanRewardData.is_dom_reward;
      }
      
      const { data, error } = await supabase
        .from('rewards')
        .update(updatePayload)
        .eq('id', existingId)
        .select()
        .single(); // Expecting a single reward
      
      const endTime = performance.now();
      console.log(`[saveReward] Update operation took ${endTime - startTime}ms`);
      
      if (error) throw error;
      
      return { ...data, is_dom_reward: data?.is_dom_reward ?? false } as Reward;

    } else {
      // For new rewards, ensure required fields like cost, supply, and is_dom_reward have defaults or are asserted
      const dataToSave: Omit<Reward, 'id' | 'created_at' | 'updated_at'> & { title: string; cost: number; supply: number; is_dom_reward: boolean } = {
        title: reward.title,
        description: reward.description || null,
        cost: reward.cost ?? 0, // Default cost if not provided
        supply: reward.supply ?? 0, // Default supply if not provided
        background_image_url: reward.background_image_url || null,
        background_opacity: reward.background_opacity || 100,
        icon_name: reward.icon_name || null,
        icon_url: reward.icon_url || null,
        icon_color: reward.icon_color || '#9b87f5',
        title_color: reward.title_color || '#FFFFFF',
        subtext_color: reward.subtext_color || '#8E9196',
        calendar_color: reward.calendar_color || '#7E69AB',
        highlight_effect: reward.highlight_effect || false,
        focal_point_x: reward.focal_point_x || 50,
        focal_point_y: reward.focal_point_y || 50,
        is_dom_reward: reward.is_dom_reward ?? false, // Default is_dom_reward
      };
      
      const { data, error } = await supabase
        .from('rewards')
        .insert(dataToSave)
        .select()
        .single(); // Expecting a single reward
      
      const endTime = performance.now();
      console.log(`[saveReward] Insert operation took ${endTime - startTime}ms`);
      
      if (error) throw error;
      
      return { ...data, is_dom_reward: data?.is_dom_reward ?? false } as Reward;
    }
  } catch (err: any) {
    console.error('[saveReward] Error saving reward:', err);
    toast({
      title: 'Error saving reward',
      description: err.message || 'Could not save reward',
      variant: 'destructive',
    });
    return null;
  }
};

export const deleteReward = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error('Error deleting reward:', err);
    toast({
      title: 'Error deleting reward',
      description: err.message || 'Could not delete reward',
      variant: 'destructive',
    });
    return false;
  }
};

export const updateRewardSupply = async (id: string, newSupply: number): Promise<boolean> => {
  try {
    // CRITICAL: Only update the supply field, nothing else
    const { error } = await supabase
      .from('rewards')
      .update({ supply: newSupply })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error('Error updating reward supply:', err);
    toast({
      title: 'Error updating reward',
      description: err.message || 'Could not update reward supply',
      variant: 'destructive',
    });
    return false;
  }
};
