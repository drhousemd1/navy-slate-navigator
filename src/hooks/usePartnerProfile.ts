
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

  return useQuery({
    queryKey: ['partner-profile', user?.id],
    queryFn: async (): Promise<PartnerProfile | null> => {
      if (!user?.id) {
        return null;
      }

      // First, get the linked partner ID using the database function
      const { data: linkedPartnerData, error: linkedPartnerError } = await supabase
        .rpc('get_linked_partner_id', { user_id_param: user.id });

      if (linkedPartnerError) {
        logger.error('Error fetching linked partner ID:', linkedPartnerError);
        return null;
      }

      if (!linkedPartnerData) {
        return null;
      }

      // Then fetch the partner's profile
      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url, role')
        .eq('id', linkedPartnerData)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching partner profile:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1 * 60 * 60 * 1000, // 1 hour
    retry: 3,
  });
};
