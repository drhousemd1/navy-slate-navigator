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

const MAX_ADMIN_CHECK_RETRIES = 2; // Max 2 attempts (1 initial + 1 retry)
const ADMIN_CHECK_RETRY_DELAY_MS = 1500; // 1.5 seconds delay

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

      setAuthState({
        user: user,
        session: initialSupabaseSession,
        loading: false,
        isAuthenticated: !!initialSupabaseSession,
        isAdmin: false, // Tentatively false, will be updated by async check below
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

      if (user) {
        const checkAdminRoleWithRetry = async (attempt = 1): Promise<boolean | null> => {
          try {
            logger.debug(`AuthContext: Initial session - User found, async checking admin role (Attempt ${attempt}) for ${user.id}`);
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });

            if (roleError) {
              logger.error(`AuthContext: Initial session - Error checking admin role (Attempt ${attempt}):`, roleError);
              if (attempt < MAX_ADMIN_CHECK_RETRIES) {
                // Add more specific retry conditions if needed, e.g., based on error.code
                logger.info(`AuthContext: Initial session - Retrying admin role check (Attempt ${attempt + 1}) after delay.`);
                await new Promise(resolve => setTimeout(resolve, ADMIN_CHECK_RETRY_DELAY_MS));
                return await checkAdminRoleWithRetry(attempt + 1);
              }
              return null; // Failed after retries or not retryable
            }
            logger.debug(`AuthContext: Initial session - Async admin role check (Attempt ${attempt}) successful. Admin: ${!!hasAdminRole}`);
            return !!hasAdminRole;
          } catch (e) {
            logger.error(`AuthContext: Initial session - Exception during async admin role check (Attempt ${attempt}):`, e);
            if (attempt < MAX_ADMIN_CHECK_RETRIES) {
              logger.info(`AuthContext: Initial session - Retrying admin role check (Attempt ${attempt + 1}) after exception and delay.`);
              await new Promise(resolve => setTimeout(resolve, ADMIN_CHECK_RETRY_DELAY_MS));
              return await checkAdminRoleWithRetry(attempt + 1);
            }
            return null; // Failed after retries
          }
        };

        const adminStatus = await checkAdminRoleWithRetry();
        if (adminStatus !== null) {
          setAuthState(prev => ({ ...prev, isAdmin: adminStatus }));
          logger.debug(`AuthContext: Initial session - Final admin status after check/retry set to: ${adminStatus}`);
        } else {
          logger.warn(`AuthContext: Initial session - Could not determine admin status after ${MAX_ADMIN_CHECK_RETRIES} attempts. isAdmin remains false.`);
          // isAdmin remains false as per initial state set earlier
        }
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', newSessionState: Session | null) => {
        logger.debug("AuthContext: Auth state change event:", _event, "New Session State:", newSessionState);
        const user = newSessionState?.user ?? null;

        setAuthState(prev => ({
          ...prev,
          user: user,
          session: newSessionState,
          loading: false, 
          isAdmin: user ? prev.isAdmin : false, 
          userExists: !!user,
          sessionExists: !!newSessionState,
          isAuthenticated: !!newSessionState, // Ensure isAuthenticated is also updated here
        }));
        // Log the state *after* it's set, or use the values directly
        logger.debug("AuthContext: State updated after auth event. New state:", {
            userExists: !!user,
            sessionExists: !!newSessionState,
            isAuthenticated: !!newSessionState, // Corrected logging
            isAdmin: user ? authState.isAdmin : false, // This logs the potentially stale authState.isAdmin
                                                     // Better to log based on what was just set if prev.isAdmin was used.
                                                     // For simplicity, this log is indicative.
            loading: false,
        });
        
        if (user) {
          try {
            logger.debug("AuthContext: Auth state change - User found, async checking admin role for", user.id);
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              logger.error("AuthContext: Auth state change - Error checking admin role (async):", roleError);
              // Do not change isAdmin on error, preserve previous state
            } else {
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
            // Do not change isAdmin on exception, preserve previous state
          }
        } else {
          // If no user, ensure isAdmin is false (already handled by the main setAuthState above if prev.isAdmin logic is sound)
          // Explicitly setting it again if user is null is safe.
           setAuthState(prev => {
            if (prev.isAdmin) { // Only log if it actually changes from true to false
                logger.debug("AuthContext: Auth state change - No user, isAdmin changing from true to false.");
                return { ...prev, isAdmin: false };
            }
            return prev; // No change if already false
          });
        }
        
        switch (_event) {
          case 'SIGNED_IN':
            logger.debug("AuthContext: Event SIGNED_IN processed.");
            // Admin role is checked by the async logic above if user is present.
            break;
          case 'SIGNED_OUT':
            logger.debug("AuthContext: Event SIGNED_OUT processed. Clearing caches.");
            await clearAllCaches(); 
            // isAdmin is already false because user is null (handled by the logic above)
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
            logger.debug("AuthContext: Event TOKEN_REFRESHED processed. Session and admin role (async) re-validated.");
            // isAdmin should have been preserved initially by `prev.isAdmin`
            // and then re-confirmed/updated by the async check.
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
