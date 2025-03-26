
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
  icon_url?: string;
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
    // Explicitly sort by created_at to maintain consistent order
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching rewards:', error);
      toast({
        title: 'Error fetching rewards',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }

    console.log('Fetched rewards with sort order:', data);
    return data as Reward[];
  } catch (err) {
    console.error('Unexpected error fetching rewards:', err);
    toast({
      title: 'Error fetching rewards',
      description: 'Could not fetch rewards',
      variant: 'destructive',
    });
    return [];
  }
};

export const saveReward = async (reward: Partial<Reward>, existingId?: string): Promise<Reward | null> => {
  try {
    if (existingId) {
      // Update existing reward - CRITICAL: Don't include updated_at field at all
      const { data, error } = await supabase
        .from('rewards')
        .update(reward)
        .eq('id', existingId)
        .select();
      
      if (error) throw error;
      return data[0] as Reward;
    } else {
      // Create new reward
      const { data, error } = await supabase
        .from('rewards')
        .insert(reward)
        .select();
      
      if (error) throw error;
      return data[0] as Reward;
    }
  } catch (err: any) {
    console.error('Error saving reward:', err);
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
