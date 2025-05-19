
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  // No user check here, RLS should handle data access.
  // If anonymous users should see nothing, RLS will enforce it.
  // If authenticated users see their data, RLS + auth.uid() in policies.
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching punishments:', error);
    throw error;
  }
  return data || [];
};
