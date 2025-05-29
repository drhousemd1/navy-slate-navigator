
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
        .select('id, linked_partner_id')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('Error fetching profile for UserIdsContext:', error);
        setUserIds({ subUserId: user.id, domUserId: user.id });
        setIsLoadingUserIds(false);
        return;
      }

      if (profile) {
        // For data isolation: current user is always the primary user
        // If they have a linked partner, both users share the same data pool
        // The subUserId and domUserId represent the data ownership perspective
        if (profile.linked_partner_id) {
          // Both users in a linked pair can access the same data
          // The data is owned by either user in the pair
          setUserIds({
            subUserId: profile.id,
            domUserId: profile.linked_partner_id,
          });
        } else {
          // Solo user - they are both sub and dom for their own data
          setUserIds({
            subUserId: profile.id,
            domUserId: profile.id,
          });
        }
      } else {
        setUserIds({ subUserId: user.id, domUserId: user.id });
      }
    } catch (e) {
      logger.error('Exception in initializeUserIds:', e);
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
