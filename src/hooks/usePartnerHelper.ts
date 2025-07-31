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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('[usePartnerHelper] ❌ Error fetching partner ID:', error);
        return null;
      }

      if (!profile) {
        logger.warn('[usePartnerHelper] ⚠️ No profile found for user:', user.id);
        return null;
      }

      const partnerId = profile?.linked_partner_id || null;
      logger.info('[usePartnerHelper] ✅ Partner ID retrieved:', partnerId ? 'FOUND' : 'NOT_FOUND', { 
        userId: user.id,
        partnerId: partnerId || 'null' 
      });
      
      // Add validation
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