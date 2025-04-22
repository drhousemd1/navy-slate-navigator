
import { supabase } from '@/integrations/supabase/client';

export const deleteRuleFromDb = async (ruleId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }

  return true;
};

