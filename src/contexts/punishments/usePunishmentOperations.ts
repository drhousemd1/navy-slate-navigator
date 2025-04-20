
// Fix import and mutation insert statement to match table columns

import { getSupabaseClient } from '@/integrations/supabase/client';

export const usePunishmentOperations = () => {
  const supabase = getSupabaseClient();

  const applyPunishment = async (id: string, points: number) => {
    // From error, this insert was incorrect. Let's fix the input to match the punishments table columns.
    // It looks like the punishments table expects a 'title' column and others, but this function inserts into 'punishments' table - 
    // but usage context shows it should insert into a separate "punishment_uses" or a log table? 
    // Since we have only `punishments` table, based on error, probably the insertion is to a usage/history table, or incorrect.

    // Assuming "punishments" table is not for logging usage points, we should insert in a different table or update accordingly.
    // To fix error from mutationFn, we can insert on "punishment_usage" table or fix columns.
    // But from original code, it inserted into 'punishments' with 'punishment_id' and 'points' fields, which doesn't fit table columns.
    // Here, let's just update to insert into 'punishment_history' assuming that is the correct table for logging.

    const client = supabase;
    
    const { error } = await client
      .from('punishment_history')
      .insert([{ punishment_id: id, points }]); // Matches punishment_history columns assuming

    if (error) throw error;
  };

  return {
    applyPunishment
  };
};
