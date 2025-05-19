
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';

export const fetchPunishmentById = async (id: string): Promise<PunishmentData | null> => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .eq('id', id)
    .single(); // Use single to get one record or null

  if (error) {
    if (error.code === 'PGRST116') { // PGRST116 means "The result contains 0 rows"
      console.warn(`Punishment with id ${id} not found.`);
      return null;
    }
    console.error(`Error fetching punishment with id ${id}:`, error);
    throw error;
  }
  return data as PunishmentData | null;
};
