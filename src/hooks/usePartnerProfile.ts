
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

interface PartnerProfile {
  id: string;
  avatar_url: string | null;
  role: string;
}

export const usePartnerProfile = () => {
  const { user } = useAuth();
  const linkedPartnerId = user?.user_metadata?.linked_partner_id;

  return useQuery({
    queryKey: ['partner-profile', linkedPartnerId],
    queryFn: async (): Promise<PartnerProfile | null> => {
      if (!linkedPartnerId) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url, role')
        .eq('id', linkedPartnerId)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching partner profile:', error);
        return null;
      }

      return data;
    },
    enabled: !!linkedPartnerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
