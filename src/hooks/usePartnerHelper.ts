import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

export const usePartnerHelper = () => {
  const { user } = useAuth();

  const getPartnerId = useCallback(async (): Promise<string | null> => {
    if (!user) {
      logger.warn('[usePartnerHelper] User not authenticated');
      return null;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('[usePartnerHelper] Error fetching partner ID:', error);
        return null;
      }

      return profile?.linked_partner_id || null;
    } catch (error) {
      logger.error('[usePartnerHelper] Exception getting partner ID:', error);
      return null;
    }
  }, [user]);

  return {
    getPartnerId
  };
};