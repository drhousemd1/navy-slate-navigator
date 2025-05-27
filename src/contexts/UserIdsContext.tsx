
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

interface UserIds {
  subUserId: string | null;
  domUserId: string | null;
}

interface UserIdsContextType extends UserIds {
  isLoadingUserIds: boolean;
  initializeUserIds: () => Promise<void>;
}

const UserIdsContext = createContext<UserIdsContextType | undefined>(undefined);

export const UserIdsProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [userIds, setUserIds] = useState<UserIds>({ subUserId: null, domUserId: null });
  const [isLoadingUserIds, setIsLoadingUserIds] = useState(true);
  const { user } = useAuth();

  const initializeUserIds = useCallback(async () => {
    if (!user) {
      setUserIds({ subUserId: null, domUserId: null });
      setIsLoadingUserIds(false);
      return;
    }

    setIsLoadingUserIds(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, linked_partner_id, role') // Added role to select
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('Error fetching profile for UserIdsContext:', error);
        // Fallback: if a user exists but profile fetch fails, use their ID for both roles temporarily.
        // This might happen if the profile row hasn't been created yet for a new user.
        setUserIds({ subUserId: user.id, domUserId: user.id }); 
        setIsLoadingUserIds(false);
        return;
      }

      if (profile) {
        const currentUserRole = profile.role; // 'submissive' or 'dominant'
        const partnerId = profile.linked_partner_id;

        if (currentUserRole === 'submissive') {
          setUserIds({
            subUserId: profile.id,
            domUserId: partnerId || profile.id, // Partner is Dom, or self if no partner
          });
        } else if (currentUserRole === 'dominant') {
          setUserIds({
            subUserId: partnerId || profile.id, // Partner is Sub, or self if no partner
            domUserId: profile.id,
          });
        } else {
          // Default or unknown role: assume current user is sub, partner is dom (or self)
          logger.warn(`User ${profile.id} has an unrecognized role: ${currentUserRole}. Defaulting user ID assignment.`);
          setUserIds({
            subUserId: profile.id,
            domUserId: partnerId || profile.id,
          });
        }
        logger.log('UserIdsContext: User IDs initialized:', {
            subUserId: currentUserRole === 'submissive' ? profile.id : (partnerId || profile.id),
            domUserId: currentUserRole === 'dominant' ? profile.id : (partnerId || profile.id)
        });
      } else {
        // This case should ideally not be reached if 'user' is present and profile creation is robust.
        logger.warn('UserIdsContext: Profile data not found for authenticated user. Using user.id as fallback for both roles.');
        setUserIds({ subUserId: user.id, domUserId: user.id });
      }
    } catch (e) {
      logger.error('Exception in initializeUserIds:', e);
      // Fallback to user's ID for both in case of unexpected errors
      setUserIds({ subUserId: user.id, domUserId: user.id });
    } finally {
      setIsLoadingUserIds(false);
    }
  }, [user]);

  useEffect(() => {
    initializeUserIds();
  }, [initializeUserIds]);

  return (
    <UserIdsContext.Provider value={{ ...userIds, isLoadingUserIds, initializeUserIds }}>
      {children}
    </UserIdsContext.Provider>
  );
};

export const useUserIds = () => {
  const context = useContext(UserIdsContext);
  if (context === undefined) {
    throw new Error('useUserIds must be used within a UserIdsProvider');
  }
  return context;
};
