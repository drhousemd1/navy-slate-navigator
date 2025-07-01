
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
  const { getLinkedPartnerId } = useAuth();
  const linkedPartnerId = getLinkedPartnerId();

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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1 * 60 * 60 * 1000, // 1 hour
    retry: 3,
  });
};
