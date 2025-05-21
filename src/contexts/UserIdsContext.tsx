
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext'; // Assuming AuthContext provides the current user

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
  const { user } = useAuth(); // Get the current authenticated user

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
        console.error('Error fetching profile for UserIdsContext:', error);
        setUserIds({ subUserId: user.id, domUserId: user.id }); // Fallback for solo user
        setIsLoadingUserIds(false);
        return;
      }

      if (profile) {
        if (profile.linked_partner_id) {
          // Assuming the current user `profile.id` is the submissive one if a partner is linked.
          // This logic might need adjustment based on how primary role is determined.
          // For now, let's assume current user is 'sub' if linked, partner is 'dom'.
          // If the app has a clearer role definition (e.g. a 'role' field in profile), that should be used.
          // One common pattern: if user A links to user B, user A might be sub, user B dom.
          // Or, it could be that `user.id` is always one role, and `linked_partner_id` is the other.
          // For this implementation, we'll make a simple assumption:
          // User logs in. If they have a linked partner, their ID is subId, partner's is domId.
          // If no partner, their ID is used for both.
          // This needs to be robust. A common pattern is to have a 'primary_role' field.
          // Lacking that, this is an educated guess.
          
          // Let's assume a simple scenario: the logged-in user is considered primary.
          // If they have a linked partner, we need to decide who is sub and who is dom.
          // For now: logged-in user is sub, partner is dom. This is a placeholder assumption.
          // A more robust system would involve fetching both profiles if linked_partner_id exists
          // and determining roles, or having a 'role' field on the profile.
          
          // Simplified: current user is always sub for their view, partner (if any) is dom.
          // If current user is dom, then their ID is domId, partner is subId.
          // This context needs a way to know the logged-in user's "perspective" or primary role.

          // Let's refine: If user A is logged in.
          // subUserId = userA.id
          // domUserId = userA.linked_partner_id ?? userA.id
          // This means the "submissive" view is always the logged-in user's direct points/supply.
          // The "dominant" view is their partner's points/supply, or their own if solo.
          // This seems a reasonable interpretation for now.
          setUserIds({
            subUserId: profile.id,
            domUserId: profile.linked_partner_id || profile.id,
          });
        } else {
          // Solo user, their ID is used for both roles
          setUserIds({
            subUserId: profile.id,
            domUserId: profile.id,
          });
        }
      } else {
         // Should not happen if user is authenticated, but as a fallback
        setUserIds({ subUserId: user.id, domUserId: user.id });
      }
    } catch (e) {
      console.error('Exception in initializeUserIds:', e);
      setUserIds({ subUserId: user.id, domUserId: user.id }); // Fallback
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
