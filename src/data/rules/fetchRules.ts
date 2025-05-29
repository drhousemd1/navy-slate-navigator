
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { logger } from '@/lib/logger';

export const fetchRules = async (subUserId: string | null, domUserId: string | null): Promise<Rule[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchRules] No user IDs provided, returning empty array");
    return [];
  }

  logger.debug('[fetchRules] Fetching rules with user filtering');
  
  try {
    // Build user filter - include both sub and dom user IDs for partner sharing
    const userIds = [subUserId, domUserId].filter(Boolean);
    
    if (userIds.length === 0) {
      logger.warn('[fetchRules] No valid user IDs for filtering');
      return [];
    }

    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[fetchRules] Supabase error fetching rules:', error);
      throw error;
    }

    return (data || []).map(rule => ({
      ...rule,
      priority: (rule.priority as "low" | "medium" | "high") ?? "medium"
    })) as Rule[];
  } catch (error) {
    logger.error('[fetchRules] Error fetching rules:', error);
    throw error;
  }
};
