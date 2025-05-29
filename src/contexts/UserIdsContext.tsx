
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
    logger.debug('[UserIdsProvider] initializeUserIds called with user:', user?.id);
    
    if (!user) {
      logger.debug('[UserIdsProvider] No user, resetting userIds');
      setUserIds({ subUserId: null, domUserId: null });
      setIsLoadingUserIds(false);
      return;
    }

    setIsLoadingUserIds(true);
    try {
      logger.debug('[UserIdsProvider] Fetching profile for user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, linked_partner_id')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('[UserIdsProvider] Error fetching profile:', error);
        // Fallback: use current user as both sub and dom
        const fallbackIds = { subUserId: user.id, domUserId: user.id };
        logger.debug('[UserIdsProvider] Using fallback IDs:', fallbackIds);
        setUserIds(fallbackIds);
        setIsLoadingUserIds(false);
        return;
      }

      if (profile) {
        logger.debug('[UserIdsProvider] Profile found:', { 
          id: profile.id, 
          linked_partner_id: profile.linked_partner_id 
        });
        
        // For data isolation: current user is always the primary user
        // If they have a linked partner, both users share the same data pool
        // The subUserId and domUserId represent the data ownership perspective
        if (profile.linked_partner_id) {
          // Both users in a linked pair can access the same data
          // The data is owned by either user in the pair
          const linkedIds = {
            subUserId: profile.id,
            domUserId: profile.linked_partner_id,
          };
          logger.debug('[UserIdsProvider] Setting linked partner IDs:', linkedIds);
          setUserIds(linkedIds);
        } else {
          // Solo user - they are both sub and dom for their own data
          const soloIds = {
            subUserId: profile.id,
            domUserId: profile.id,
          };
          logger.debug('[UserIdsProvider] Setting solo user IDs:', soloIds);
          setUserIds(soloIds);
        }
      } else {
        // No profile found, use current user as fallback
        const fallbackIds = { subUserId: user.id, domUserId: user.id };
        logger.debug('[UserIdsProvider] No profile found, using fallback:', fallbackIds);
        setUserIds(fallbackIds);
      }
    } catch (e) {
      logger.error('[UserIdsProvider] Exception in initializeUserIds:', e);
      const fallbackIds = { subUserId: user.id, domUserId: user.id };
      logger.debug('[UserIdsProvider] Exception fallback IDs:', fallbackIds);
      setUserIds(fallbackIds);
    } finally {
      setIsLoadingUserIds(false);
      logger.debug('[UserIdsProvider] initializeUserIds completed');
    }
  }, [user]);

  useEffect(() => {
    initializeUserIds();
  }, [initializeUserIds]);

  const contextValue = {
    ...userIds,
    isLoadingUserIds,
    initializeUserIds
  };

  logger.debug('[UserIdsProvider] Context value:', contextValue);

  return (
    <UserIdsContext.Provider value={contextValue}>
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
