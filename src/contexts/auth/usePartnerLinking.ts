
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';

export const usePartnerLinking = (user: any, setUser: (user: any) => void) => {
  const [loading, setLoading] = useState(false);

  const generateLinkCode = async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      
      // Generate a unique 8-character code
      const linkCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('profiles')
        .update({ partner_link_code: linkCode })
        .eq('id', user.id);

      if (error) throw error;

      // Update user state
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
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const linkToPartner = async (partnerCode: string): Promise<boolean> => {
    if (!user || !partnerCode.trim()) return false;
    
    try {
      setLoading(true);
      
      // Find partner by link code
      const { data: partnerProfile, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('partner_link_code', partnerCode.toUpperCase())
        .single();

      if (findError || !partnerProfile) {
        toast({ title: 'Error', description: 'Invalid link code. Please check and try again.', variant: 'destructive' });
        return false;
      }

      if (partnerProfile.id === user.id) {
        toast({ title: 'Error', description: 'You cannot link to yourself.', variant: 'destructive' });
        return false;
      }

      // Check if either user is already linked
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
        toast({ title: 'Error', description: 'You are already linked to a partner. Please unlink first.', variant: 'destructive' });
        return false;
      }

      if (partnerCurrentProfile?.linked_partner_id) {
        toast({ title: 'Error', description: 'That user is already linked to someone else.', variant: 'destructive' });
        return false;
      }

      // Link both users
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

      // Update user state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          linked_partner_id: partnerProfile.id
        }
      });

      toast({ title: 'Success', description: 'Successfully linked to partner!' });
      return true;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error linking to partner:', errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unlinkFromPartner = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setLoading(true);
      
      // Get current partner ID
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      const partnerId = currentProfile?.linked_partner_id;
      
      if (!partnerId) {
        toast({ title: 'Info', description: 'You are not currently linked to anyone.' });
        return false;
      }

      // Unlink both users
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

      // Update user state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          linked_partner_id: null
        }
      });

      toast({ title: 'Success', description: 'Successfully unlinked from partner.' });
      return true;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Error unlinking from partner:', errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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

      // Get partner's email from auth.users through profiles
      const { data: partnerData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', partnerId)
        .single();

      if (partnerData) {
        // For now, just return basic info - we can't easily get email from auth.users
        return { email: 'Partner' }; // Placeholder since we can't access auth.users email
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
