
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../types';
import { logger } from '@/lib/logger';

export const REWARDS_QUERY_KEY = ['rewards'];

export const fetchRewards = async (subUserId: string | null, domUserId: string | null): Promise<Reward[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchRewards] No user IDs provided, returning empty array");
    return [];
  }

  logger.debug('[fetchRewards] Fetching rewards with user filtering');
  
  try {
    // Build user filter - include both sub and dom user IDs for partner sharing
    const userIds = [subUserId, domUserId].filter(Boolean);
    
    if (userIds.length === 0) {
      logger.warn('[fetchRewards] No valid user IDs for filtering');
      return [];
    }

    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[fetchRewards] Supabase error fetching rewards:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('[fetchRewards] Error fetching rewards:', error);
    throw error;
  }
};
