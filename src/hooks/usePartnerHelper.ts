import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export const usePartnerHelper = () => {
  const { user } = useAuth();

  const getPartnerId = useCallback(async (): Promise<string | null> => {
    if (!user) {
      logger.warn('[usePartnerHelper] User not authenticated');
      return null;
    }

    try {
      logger.info('[usePartnerHelper] 🔍 Fetching partner ID for user:', user.id);
      
      // Use the database function for consistency
      const { data: partnerId, error } = await supabase
        .rpc('get_linked_partner_id', { user_id_param: user.id });

      if (error) {
        logger.error('[usePartnerHelper] ❌ Error fetching partner ID:', error);
        return null;
      }

      logger.info('[usePartnerHelper] ✅ Partner ID retrieved:', partnerId ? 'FOUND' : 'NOT_FOUND', { 
        userId: user.id,
        partnerId: partnerId || 'null' 
      });
      
      // Validate the partner ID
      if (partnerId && typeof partnerId === 'string' && partnerId.length > 0) {
        logger.info('[usePartnerHelper] ✅ Valid partner ID confirmed:', partnerId);
        return partnerId;
      } else {
        logger.warn('[usePartnerHelper] ⚠️ Partner ID is null/empty/invalid');
        return null;
      }
    } catch (error) {
      logger.error('[usePartnerHelper] 💥 Exception getting partner ID:', error);
      return null;
    }
  }, [user]);

  return {
    getPartnerId
  };
};