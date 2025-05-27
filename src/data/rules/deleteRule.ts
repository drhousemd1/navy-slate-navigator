
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger'; // Ensure logger is imported

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
