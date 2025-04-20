
import { getSupabaseClient } from '@/integrations/supabase/client';

export const usePunishmentOperations = () => {
  const supabase = getSupabaseClient();

  const applyPunishment = async (id: string, points: number) => {
    const { error } = await supabase
      .from('punishments')
      .insert([{ punishment_id: id, points }]);
    if (error) throw error;
  };

  return {
    applyPunishment
  };
};
