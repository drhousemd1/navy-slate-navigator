
// Fix import and mutation insert statement to match table columns

import { getSupabaseClient } from '@/integrations/supabase/client';

export const usePunishmentOperations = () => {
  const supabase = getSupabaseClient();

  const applyPunishment = async (id: string, points: number) => {
    // Insert into punishment_history with correct field names (points_deducted and day_of_week required)
    // For this, assume day_of_week as current day (0-6) from JS Date

    const dayOfWeek = new Date().getDay();

    const { error } = await supabase
      .from('punishment_history')
      .insert([{
        punishment_id: id,
        points_deducted: points,
        day_of_week: dayOfWeek,
      }]);

    if (error) throw error;
  };

  return {
    applyPunishment
  };
};

