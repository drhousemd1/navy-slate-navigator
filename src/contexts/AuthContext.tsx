import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/data/queryClient';
import localforage from 'localforage';
import { STORAGE_PREFIX as FORM_STATE_PREFIX } from '@/hooks/useFormStatePersister';
import { useAuthOperations } from './auth/useAuthOperations';
import { useUserProfile } from './auth/useUserProfile';
import { logger } from '@/lib/logger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean; 
  isAuthenticated: boolean;
  isAdmin: boolean;
  userExists: boolean;
  sessionExists: boolean;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  signIn: ReturnType<typeof useAuthOperations>['signIn'];
  signUp: ReturnType<typeof useAuthOperations>['signUp'];
  resetPassword: ReturnType<typeof useAuthOperations>['resetPassword'];
  updatePassword: ReturnType<typeof useAuthOperations>['updatePassword'];
  deleteAccount: ReturnType<typeof useAuthOperations>['deleteAccount']; 
  getNickname: ReturnType<typeof useUserProfile>['getNickname'];
  getProfileImage: ReturnType<typeof useUserProfile>['getProfileImage'];
  getUserRole: ReturnType<typeof useUserProfile>['getUserRole'];
  updateNickname: ReturnType<typeof useUserProfile>['updateNickname'];
  uploadProfileImageAndUpdateState: ReturnType<typeof useUserProfile>['uploadProfileImageAndUpdateState'];
  deleteUserProfileImage: ReturnType<typeof useUserProfile>['deleteUserProfileImage'];
  updateUserRole: ReturnType<typeof useUserProfile>['updateUserRole'];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true, 
    isAuthenticated: false,
    isAdmin: false,
    userExists: false,
    sessionExists: false,
  });

  const authOperations = useAuthOperations();
  const wrappedSetUserForProfile = (updatedUser: User | null) => {
    setAuthState(currentAuthState => ({
      ...currentAuthState,
      user: updatedUser,
      userExists: !!updatedUser,
    }));
  };
  const userProfileUtils = useUserProfile(authState.user, wrappedSetUserForProfile);

  useEffect(() => {
    logger.debug("AuthContext: Initializing, setting up listeners...");
    const checkInitialSession = async () => {
      logger.debug("AuthContext: Checking initial session...");
      const { data: { session: initialSupabaseSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error("AuthContext: Error getting initial session:", sessionError);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      logger.debug("AuthContext: Initial session data from Supabase:", initialSupabaseSession);
      const user = initialSupabaseSession?.user ?? null;

      // Set primary auth state and loading to false first. isAdmin is tentatively false.
      setAuthState({
        user: user,
        session: initialSupabaseSession,
        loading: false, // KEY CHANGE: Set loading false now
        isAuthenticated: !!initialSupabaseSession,
        isAdmin: false, // Tentatively false for initial load, will be updated asynchronously
        userExists: !!user,
        sessionExists: !!initialSupabaseSession,
      });
      logger.debug("AuthContext: Initialized. Primary state set, loading false. Current state:", {
        userExists: !!user,
        sessionExists: !!initialSupabaseSession,
        isAuthenticated: !!initialSupabaseSession,
        isAdmin: false, // At this point
        loading: false,
      });

      // If user exists, asynchronously check admin role
      if (user) {
        try {
          logger.debug("AuthContext: Initial session - User found, async checking admin role for", user.id);
          const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
            requested_user_id: user.id,
            requested_role: 'admin'
          });
          if (roleError) {
            logger.error("AuthContext: Initial session - Error checking admin role (async):", roleError);
            // Optionally set isAdmin to false explicitly on error, or let it be.
            // Current behavior is to leave it as it was (which was false from above).
          } else {
            setAuthState(prev => ({ ...prev, isAdmin: !!hasAdminRole }));
            logger.debug("AuthContext: Initial session - Async admin role check complete. isAdmin updated to:", !!hasAdminRole);
          }
        } catch (e) {
          logger.error("AuthContext: Initial session - Exception during async admin role check:", e);
        }
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', newSessionState: Session | null) => {
        logger.debug("AuthContext: Auth state change event:", _event, "New Session State:", newSessionState);
        const user = newSessionState?.user ?? null;

        // Update primary auth state. Loading remains false.
        // CRITICAL FIX: Preserve previous isAdmin if user exists, otherwise set to false.
        setAuthState(prev => ({
          ...prev,
          user: user,
          session: newSessionState,
          loading: false, // Ensure loading is false after any event
          isAdmin: user ? prev.isAdmin : false, // Preserve isAdmin if user exists, else false
          userExists: !!user,
          sessionExists: !!newSessionState,
        }));
        logger.debug("AuthContext: State updated after auth event. New state (isAdmin preserved if user exists):", {
            userExists: !!user,
            sessionExists: !!newSessionState,
            isAuthenticated: !!newSessionState,
            isAdmin: user ? authState.isAdmin : false, // Log current isAdmin for clarity
            loading: false,
        });

        // If user exists, asynchronously check admin role
        if (user) {
          try {
            logger.debug("AuthContext: Auth state change - User found, async checking admin role for", user.id);
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              logger.error("AuthContext: Auth state change - Error checking admin role (async):", roleError);
              // If role check fails, we might want to set isAdmin to false.
              // Or, trust the previous state if the failure is transient.
              // For now, only update on success.
            } else {
              // Only update isAdmin if it has actually changed from the async check
              setAuthState(prev => {
                if (prev.isAdmin !== !!hasAdminRole) {
                  logger.debug(`AuthContext: Auth state change - Async admin role changed from ${prev.isAdmin} to ${!!hasAdminRole}`);
                  return { ...prev, isAdmin: !!hasAdminRole };
                }
                logger.debug(`AuthContext: Auth state change - Async admin role confirmed as ${prev.isAdmin}, no change.`);
                return prev;
              });
            }
          } catch (e) {
            logger.error("AuthContext: Auth state change - Exception during async admin role check:", e);
          }
        } else {
          // If no user, ensure isAdmin is false (already handled by the main setAuthState above, but good to be explicit)
          setAuthState(prev => ({ ...prev, isAdmin: false }));
          logger.debug("AuthContext: Auth state change - No user, isAdmin definitively false.");
        }
        
        switch (_event) {
          case 'SIGNED_IN':
            logger.debug("AuthContext: Event SIGNED_IN processed.");
            break;
          case 'SIGNED_OUT':
            logger.debug("AuthContext: Event SIGNED_OUT processed. Clearing caches.");
            await clearAllCaches(); 
            // isAdmin is already false because user is null
            break;
          case 'USER_DELETED':
            logger.debug("AuthContext: Event USER_DELETED processed. Clearing caches.");
            await clearAllCaches();
            // isAdmin is already false
            break;
          case 'PASSWORD_RECOVERY':
            logger.debug("AuthContext: Event PASSWORD_RECOVERY processed.");
            break;
          case 'TOKEN_REFRESHED':
            logger.debug("AuthContext: Event TOKEN_REFRESHED processed. Session and admin role (async) re-validated. isAdmin should have been preserved initially.");
            break;
          case 'USER_UPDATED':
            logger.debug("AuthContext: Event USER_UPDATED processed.");
            // Admin role will be re-checked by the async logic if user is present
            break;
          case 'MFA_CHALLENGE_VERIFIED':
            logger.debug("AuthContext: Event MFA_CHALLENGE_VERIFIED processed.");
            break;
          default:
            const unhandledEvent: string = _event as string; 
            logger.debug(`AuthContext: Unhandled auth event type: ${unhandledEvent}`);
            break;
        }
      }
    );

    return () => {
      logger.debug("AuthContext: Cleaning up auth subscription.");
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  const clearAllCaches = async () => {
    try {
      logger.debug('[AuthContext CacheClear] Starting cache clear process...');
      queryClient.clear();
      logger.debug('[AuthContext CacheClear] React Query in-memory cache cleared.');

      await localforage.removeItem('APP_QUERY_CACHE');
      logger.debug('[AuthContext CacheClear] Persisted React Query cache (APP_QUERY_CACHE) removed from localforage.');
      
      const keys = await localforage.keys();
      const formStateKeys = keys.filter(key => key.startsWith(FORM_STATE_PREFIX));
      for (const key of formStateKeys) {
        await localforage.removeItem(key);
      }
      logger.debug(`[AuthContext CacheClear] Cleared ${formStateKeys.length} persisted form drafts using prefix: ${FORM_STATE_PREFIX}`);
      
      toast({ title: "Cache Cleared", description: "Application cache and drafts have been cleared." });
      logger.debug('[AuthContext CacheClear] Cache clear process completed.');
    } catch (error) {
      logger.error("AuthContext: Error clearing caches:", error);
      toast({ title: "Cache Clear Error", description: "Could not clear all application caches.", variant: "destructive" });
    }
  };

  const signOut = async () => {
    logger.debug("AuthContext: signOut called. Setting loading true temporarily for operation.");
    setAuthState(prev => ({ ...prev, loading: true })); 
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('AuthContext: Error signing out:', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
      setAuthState(prev => ({ ...prev, loading: false })); 
    } else {
      logger.debug("AuthContext: Sign out successful via supabase.auth.signOut(). Waiting for onAuthStateChange for cache clearing and final state update (which includes loading: false).");
      // onAuthStateChange will set loading to false and isAdmin to false.
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    signIn: authOperations.signIn,
    signUp: authOperations.signUp,
    resetPassword: authOperations.resetPassword,
    updatePassword: authOperations.updatePassword,
    deleteAccount: authOperations.deleteAccount,
    getNickname: userProfileUtils.getNickname,
    getProfileImage: userProfileUtils.getProfileImage,
    getUserRole: userProfileUtils.getUserRole,
    updateNickname: userProfileUtils.updateNickname,
    uploadProfileImageAndUpdateState: userProfileUtils.uploadProfileImageAndUpdateState,
    deleteUserProfileImage: userProfileUtils.deleteUserProfileImage,
    updateUserRole: userProfileUtils.updateUserRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
