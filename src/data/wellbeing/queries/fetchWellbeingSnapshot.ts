import { supabase } from '@/integrations/supabase/client';
import { WellbeingSnapshot } from '../types';
import { logger } from '@/lib/logger';

export const fetchWellbeingSnapshot = async (userId: string): Promise<WellbeingSnapshot | null> => {
  try {
    logger.debug('[fetchWellbeingSnapshot] Fetching wellbeing snapshot for user:', userId);
    
    const { data, error } = await supabase
      .from('wellbeing_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('[fetchWellbeingSnapshot] Error fetching wellbeing snapshot:', error);
      throw error;
    }

    if (!data) {
      logger.debug('[fetchWellbeingSnapshot] No wellbeing snapshot found for user');
      return null;
    }

    // Cast the database response to our type
    const wellbeingSnapshot: WellbeingSnapshot = {
      ...data,
      metrics: data.metrics as Record<string, number>
    };

    logger.debug('[fetchWellbeingSnapshot] Successfully fetched wellbeing snapshot:', wellbeingSnapshot);
    return wellbeingSnapshot;
  } catch (error) {
    logger.error('[fetchWellbeingSnapshot] Failed to fetch wellbeing snapshot:', error);
    throw error;
  }
};