
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';

export const deleteRuleFromDb = async (ruleId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    logger.error('Error deleting rule:', error);
    throw error;
  }

  return true;
};
