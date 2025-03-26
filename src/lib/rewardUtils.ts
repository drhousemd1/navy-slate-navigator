
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  supply: number;
  background_image_url?: string | null;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  // Remove icon_url from interface
  icon_name?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  icon_color?: string;
  created_at?: string;
  updated_at?: string;
}

export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    console.log("[fetchRewards] Fetching rewards without sorting");
    
    // CRITICAL: Using explicit id-based sorting for consistent order
    // This ensures rewards are always in the same order across operations
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
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

    console.log('[fetchRewards] Raw data from Supabase BEFORE any processing:', 
      data?.map((r, i) => ({
        position: i,
        id: r.id, 
        title: r.title,
        created_at: r.created_at,
        updated_at: r.updated_at
      }))
    );
    
    // Return data exactly as received from database with consistent sorting
    return data as Reward[];
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

export const saveReward = async (reward: Partial<Reward> & { title: string }, existingId?: string): Promise<Reward | null> => {
  try {
    if (existingId) {
      // CRITICAL FIX: When updating an existing reward:
      // 1. Never update the created_at timestamp
      // 2. Don't include updated_at field at all (let Supabase handle it)
      // 3. Remove any timestamps from the data we're sending
      
      // Create a clean copy of the reward data without any timestamp fields
      // Also remove icon_url field if it exists
      const { created_at, updated_at, icon_url, ...cleanRewardData } = reward;
      
      console.log('[saveReward] Updating reward with clean data (no timestamps):', 
        { id: existingId, ...cleanRewardData });
      
      const { data, error } = await supabase
        .from('rewards')
        .update(cleanRewardData)
        .eq('id', existingId)
        .select();
      
      if (error) throw error;
      
      console.log('[saveReward] Reward updated successfully, returned data:', data[0]);
      return data[0] as Reward;
    } else {
      // Create new reward - ensure no icon_url is sent
      const { icon_url, ...cleanRewardData } = reward;
      console.log('[saveReward] Creating new reward:', cleanRewardData);
      const { data, error } = await supabase
        .from('rewards')
        .insert(cleanRewardData)
        .select();
      
      if (error) throw error;
      console.log('[saveReward] New reward created:', data[0]);
      return data[0] as Reward;
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
