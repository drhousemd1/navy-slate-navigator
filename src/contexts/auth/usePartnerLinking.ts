import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toastManager } from '@/lib/toastManager';

export const usePartnerLinking = (user: any, setUser: (user: any) => void) => {
  const [loading, setLoading] = useState(false);

  const generateLinkCode = async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      
      const linkCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('profiles')
        .update({ partner_link_code: linkCode })
        .eq('id', user.id);

      if (error) throw error;

      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          partner_link_code: linkCode
        }
      });

      logger.debug('Link code generated:', linkCode);
      return linkCode;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error generating link code:', errorMessage);
      toastManager.error('Error', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const linkToPartner = async (partnerCode: string): Promise<boolean> => {
    if (!user || !partnerCode.trim()) return false;
    
    try {
      setLoading(true);
      
      const { data: partnerProfile, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('partner_link_code', partnerCode.toUpperCase())
        .single();

      if (findError || !partnerProfile) {
        toastManager.error('Error', 'Invalid link code. Please check and try again.');
        return false;
      }

      if (partnerProfile.id === user.id) {
        toastManager.error('Error', 'You cannot link to yourself.');
        return false;
      }

      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      const { data: partnerCurrentProfile } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', partnerProfile.id)
        .single();

      if (currentUserProfile?.linked_partner_id) {
        toastManager.error('Error', 'You are already linked to a partner. Please unlink first.');
        return false;
      }

      if (partnerCurrentProfile?.linked_partner_id) {
        toastManager.error('Error', 'That user is already linked to someone else.');
        return false;
      }

      const { error: linkError1 } = await supabase
        .from('profiles')
        .update({ linked_partner_id: partnerProfile.id })
        .eq('id', user.id);

      const { error: linkError2 } = await supabase
        .from('profiles')
        .update({ linked_partner_id: user.id })
        .eq('id', partnerProfile.id);

      if (linkError1 || linkError2) {
        throw linkError1 || linkError2;
      }

      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          linked_partner_id: partnerProfile.id
        }
      });

      toastManager.success('Success', 'Successfully linked to partner!');
      return true;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error linking to partner:', errorMessage);
      toastManager.error('Error', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unlinkFromPartner = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setLoading(true);
      
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      const partnerId = currentProfile?.linked_partner_id;
      
      if (!partnerId) {
        toastManager.info('Info', 'You are not currently linked to anyone.');
        return false;
      }

      const { error: unlinkError1 } = await supabase
        .from('profiles')
        .update({ linked_partner_id: null })
        .eq('id', user.id);

      const { error: unlinkError2 } = await supabase
        .from('profiles')
        .update({ linked_partner_id: null })
        .eq('id', partnerId);

      if (unlinkError1 || unlinkError2) {
        throw unlinkError1 || unlinkError2;
      }

      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          linked_partner_id: null
        }
      });

      toastManager.success('Success', 'Successfully unlinked from partner.');
      return true;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error unlinking from partner:', errorMessage);
      toastManager.error('Error', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getLinkedPartnerInfo = async (): Promise<{ email?: string } | null> => {
    if (!user) return null;
    
    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      const partnerId = currentProfile?.linked_partner_id;
      
      if (!partnerId) return null;

      const { data: partnerData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', partnerId)
        .single();

      if (partnerData) {
        return { email: 'Partner' };
      }

      return null;
    } catch (error) {
      logger.error('Error getting partner info:', getErrorMessage(error));
      return null;
    }
  };

  const getCurrentLinkCode = (): string | null => {
    return user?.user_metadata?.partner_link_code || null;
  };

  const getLinkedPartnerId = (): string | null => {
    return user?.user_metadata?.linked_partner_id || null;
  };

  return {
    generateLinkCode,
    linkToPartner,
    unlinkFromPartner,
    getLinkedPartnerInfo,
    getCurrentLinkCode,
    getLinkedPartnerId,
    loading
  };
};
