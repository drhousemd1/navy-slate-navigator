
import { supabase } from '@/integrations/supabase/client';
import { Reward, RawSupabaseReward } from './types'; // Reward type defined in types.ts
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const REWARDS_QUERY_KEY = ['rewards'];
export const REWARDS_POINTS_QUERY_KEY = 'userPoints'; // Example, align with actual usage
export const REWARDS_DOM_POINTS_QUERY_KEY = 'userDomPoints'; // Example


export const parseRewardData = (rawReward: RawSupabaseReward): Reward => {
  // Implement full parsing logic
  return {
    id: rawReward.id,
    user_id: rawReward.user_id ?? null,
    title: rawReward.title,
    description: rawReward.description ?? null,
    cost: rawReward.cost,
    supply: rawReward.supply,
    icon_name: rawReward.icon_name ?? null,
    icon_url: rawReward.icon_url ?? null,
    icon_color: rawReward.icon_color || '#FFFFFF', // Default
    title_color: rawReward.title_color || '#FFFFFF', // Default
    subtext_color: rawReward.subtext_color || '#8E9196', // Default
    calendar_color: rawReward.calendar_color || '#7E69AB', // Default
    background_image_url: rawReward.background_image_url ?? null,
    background_opacity: rawReward.background_opacity ?? 100, // Default
    highlight_effect: rawReward.highlight_effect ?? false, // Default
    focal_point_x: rawReward.focal_point_x ?? 50, // Default
    focal_point_y: rawReward.focal_point_y ?? 50, // Default
    is_dom_reward: rawReward.is_dom_reward ?? false, // Default
    background_images: rawReward.background_images ?? null,
    created_at: rawReward.created_at,
    updated_at: rawReward.updated_at,
  };
};


export const fetchRewards = async (): Promise<Reward[]> => {
  try {
    const { data, error } = await supabase.from('rewards').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data?.map(parseRewardData) || [];
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    logger.error('Error fetching rewards:', message, e);
    throw new Error(`Failed to fetch rewards: ${message}`);
  }
};

export const fetchRewardById = async (id: string): Promise<Reward | null> => {
   try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw error;
    }
    return data ? parseRewardData(data) : null;
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    logger.error(`Error fetching reward by ID ${id}:`, message, e);
    throw new Error(`Failed to fetch reward ${id}: ${message}`);
  }
};
