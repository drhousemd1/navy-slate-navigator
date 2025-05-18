import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Reward, CreateRewardVariables, UpdateRewardVariables } from "@/data/rewards/types"; // Ensure CreateRewardVariables and UpdateRewardVariables are imported if used by saveRewardToServer

// Remove any local 'interface Reward' or 'type Reward' if it exists here.
// The functions below should use the imported 'Reward' type.

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

// Updated saveReward to use CreateRewardVariables and UpdateRewardVariables for better type safety
export const saveReward = async (
  reward: CreateRewardVariables | Omit<UpdateRewardVariables, 'id'>, // Use Omit for updateData
  existingId?: string
): Promise<Reward | null> => {
  try {
    const startTime = performance.now();
    
    if (existingId) {
      // For update, reward is Omit<UpdateRewardVariables, 'id'>
      const updatePayload: Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>> = { ...(reward as Omit<UpdateRewardVariables, 'id'>) };
      // Ensure is_dom_reward is boolean if provided
      if (typeof (reward as Omit<UpdateRewardVariables, 'id'>).is_dom_reward === 'boolean') {
        updatePayload.is_dom_reward = (reward as Omit<UpdateRewardVariables, 'id'>).is_dom_reward;
      }
      
      const { data, error } = await supabase
        .from('rewards')
        .update(updatePayload)
        .eq('id', existingId)
        .select()
        .single();
      
      const endTime = performance.now();
      console.log(`[saveReward] Update operation took ${endTime - startTime}ms`);
      
      if (error) throw error;
      
      return { ...data, is_dom_reward: data?.is_dom_reward ?? false } as Reward;

    } else {
      // For new rewards, reward is CreateRewardVariables
      const createPayload = reward as CreateRewardVariables;
      const dataToSave: Omit<Reward, 'id' | 'created_at' | 'updated_at'> = {
        title: createPayload.title,
        description: createPayload.description || null,
        cost: createPayload.cost, // Already required by CreateRewardVariables
        supply: createPayload.supply, // Already required by CreateRewardVariables
        is_dom_reward: createPayload.is_dom_reward, // Already required by CreateRewardVariables
        background_image_url: createPayload.background_image_url || null,
        background_opacity: createPayload.background_opacity || 100,
        icon_name: createPayload.icon_name || null,
        icon_url: createPayload.icon_url || null,
        icon_color: createPayload.icon_color || '#9b87f5',
        title_color: createPayload.title_color || '#FFFFFF',
        subtext_color: createPayload.subtext_color || '#8E9196',
        calendar_color: createPayload.calendar_color || '#7E69AB',
        highlight_effect: createPayload.highlight_effect || false,
        focal_point_x: createPayload.focal_point_x || 50,
        focal_point_y: createPayload.focal_point_y || 50,
      };
      
      const { data, error } = await supabase
        .from('rewards')
        .insert(dataToSave)
        .select()
        .single();
      
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
