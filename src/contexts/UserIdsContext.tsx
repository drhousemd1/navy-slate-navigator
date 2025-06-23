
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { clearUserDataFromDB } from '@/data/indexedDB/useIndexedDB';
import { ProfileRole } from '@/types/profile';

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
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const clearPreviousUserData = useCallback(async (prevUserId: string) => {
    try {
      // Clear React Query cache
      await queryClient.clear();
      
      // Clear user-specific IndexedDB data
      await clearUserDataFromDB(prevUserId);
      
      logger.debug(`Cleared data for previous user: ${prevUserId}`);
    } catch (error) {
      logger.error('Error clearing previous user data:', error);
    }
  }, [queryClient]);

  const initializeUserIds = useCallback(async () => {
    logger.debug('[UserIdsProvider] initializeUserIds called with user:', user?.id);
    
    if (!user) {
      logger.debug('[UserIdsProvider] No user, resetting userIds');
      
      // Clear cache if we had a previous user
      if (previousUserId) {
        await clearPreviousUserData(previousUserId);
        setPreviousUserId(null);
      }
      
      setUserIds({ subUserId: null, domUserId: null });
      setIsLoadingUserIds(false);
      return;
    }

    // Check if user changed and clear previous data
    if (previousUserId && previousUserId !== user.id) {
      await clearPreviousUserData(previousUserId);
    }
    setPreviousUserId(user.id);

    setIsLoadingUserIds(true);
    try {
      logger.debug('[UserIdsProvider] Fetching profile for user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, linked_partner_id')
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
          role: profile.role,
          linked_partner_id: profile.linked_partner_id 
        });
        
        // FIXED: Proper role-based assignment based on ProfileRole
        const userRole = profile.role as ProfileRole;
        
        if (profile.linked_partner_id) {
          // For linked partners, assign roles based on their ProfileRole
          if (userRole === 'sub') {
            const linkedIds = {
              subUserId: profile.id,
              domUserId: profile.linked_partner_id,
            };
            logger.debug('[UserIdsProvider] Setting sub user with linked dom:', linkedIds);
            setUserIds(linkedIds);
          } else if (userRole === 'dom') {
            const linkedIds = {
              subUserId: profile.linked_partner_id,
              domUserId: profile.id,
            };
            logger.debug('[UserIdsProvider] Setting dom user with linked sub:', linkedIds);
            setUserIds(linkedIds);
          }
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
  }, [user, previousUserId, clearPreviousUserData]);

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
