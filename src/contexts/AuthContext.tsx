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

    const checkAdminRoleWithRetry = async (userId: string, context: string, attempt = 1): Promise<boolean | null> => {
      try {
        logger.debug(`AuthContext: [${context}] User found, async checking admin role (Attempt ${attempt}) for ${userId}`);
        const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
          requested_user_id: userId,
          requested_role: 'admin'
        });

        if (roleError) {
          logger.error(`AuthContext: [${context}] Error checking admin role (Attempt ${attempt}):`, roleError);
          if (attempt < MAX_ADMIN_CHECK_RETRIES) {
            logger.info(`AuthContext: [${context}] Retrying admin role check (Attempt ${attempt + 1}) after delay.`);
            await new Promise(resolve => setTimeout(resolve, ADMIN_CHECK_RETRY_DELAY_MS));
            return await checkAdminRoleWithRetry(userId, context, attempt + 1);
          }
          return null;
        }
        logger.debug(`AuthContext: [${context}] Async admin role check (Attempt ${attempt}) successful. Admin: ${!!hasAdminRole}`);
        return !!hasAdminRole;
      } catch (e) {
        logger.error(`AuthContext: [${context}] Exception during async admin role check (Attempt ${attempt}):`, e);
        if (attempt < MAX_ADMIN_CHECK_RETRIES) {
          logger.info(`AuthContext: [${context}] Retrying admin role check (Attempt ${attempt + 1}) after exception and delay.`);
          await new Promise(resolve => setTimeout(resolve, ADMIN_CHECK_RETRY_DELAY_MS));
          return await checkAdminRoleWithRetry(userId, context, attempt + 1);
        }
        return null;
      }
    };

    const checkInitialSession = async () => {
      logger.debug("AuthContext: Checking initial session...");
      const { data: { session: initialSupabaseSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error("AuthContext: Error getting initial session:", sessionError);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      logger.debug("AuthContext: Initial session data from Supabase:", initialSupabaseSession ? { user_id: initialSupabaseSession.user.id, expires_at: initialSupabaseSession.expires_at } : null);
      const user = initialSupabaseSession?.user ?? null;

      setAuthState(prev => ({ // Use prev to ensure isAdmin isn't reset if already set by a rapid onAuthStateChange
        ...prev,
        user: user,
        session: initialSupabaseSession,
        // loading: false, // Loading will be set to false after admin check
        isAuthenticated: !!initialSupabaseSession,
        isAdmin: user ? prev.isAdmin : false, // Preserve isAdmin if user exists, otherwise false
        userExists: !!user,
        sessionExists: !!initialSupabaseSession,
      }));
      
      if (user) {
        const adminStatus = await checkAdminRoleWithRetry(user.id, "InitialSession");
        if (adminStatus !== null) {
          setAuthState(prev => ({ ...prev, isAdmin: adminStatus, loading: false }));
          logger.debug(`AuthContext: Initial session - Final admin status after check/retry set to: ${adminStatus}. Loading false.`);
        } else {
          logger.warn(`AuthContext: Initial session - Could not determine admin status. isAdmin remains as is or false. Loading false.`);
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      } else {
        setAuthState(prev => ({ ...prev, loading: false, isAdmin: false }));
        logger.debug("AuthContext: Initial session - No user. Loading false, isAdmin false.");
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', newSessionState: Session | null) => {
        logger.debug(`AuthContext: Auth state change event: ${_event}`, "New Session State:", newSessionState ? { user_id: newSessionState.user.id, expires_at: newSessionState.expires_at, event: _event } : { event: _event });
        
        const wasAuthenticated = authState.isAuthenticated; // Capture previous state BEFORE any updates from this event

        if (newSessionState) {
          const user = newSessionState.user;
          setAuthState(prev => ({
            ...prev,
            user: user,
            session: newSessionState,
            loading: true, // Set loading true for potential admin check
            isAuthenticated: true,
            isAdmin: user ? prev.isAdmin : false, // Preserve previous admin state if user exists, else false
            userExists: !!user,
            sessionExists: true,
          }));
          logger.debug("AuthContext: State updated for new session. Current state (before admin check):", {
              userExists: !!user,
              sessionExists: true,
              isAuthenticated: true,
              isAdmin: user ? authState.isAdmin : false, // Log based on current authState for prev.isAdmin
              loading: true,
          });

          if (user) {
            const adminStatus = await checkAdminRoleWithRetry(user.id, `AuthStateChange-${_event}`);
            if (adminStatus !== null) {
              setAuthState(prev => ({ ...prev, isAdmin: adminStatus, loading: false }));
              logger.debug(`AuthContext: AuthStateChange-${_event} - Admin status updated to: ${adminStatus}. Loading false.`);
            } else {
              logger.warn(`AuthContext: AuthStateChange-${_event} - Could not determine admin status. isAdmin remains as is. Loading false.`);
              setAuthState(prev => ({ ...prev, loading: false })); // Ensure loading is false
            }
          } else {
             // Should not happen if newSessionState is truthy, but as a safeguard
            setAuthState(prev => ({ ...prev, isAdmin: false, loading: false }));
          }
        } else { // newSessionState is null
          logger.debug("AuthContext: Session became null.", { event: _event, wasAuthenticated, currentLoading: authState.loading });
          setAuthState(prev => ({
            ...prev,
            user: null,
            session: null,
            isAuthenticated: false,
            isAdmin: false,
            userExists: false,
            sessionExists: false,
            // loading: true, // Tentatively set loading if recovery is attempted
          }));

          if (_event === 'SIGNED_OUT' || _event === 'USER_DELETED') {
            logger.info(`AuthContext: Explicit ${_event}. Clearing caches and finalizing.`);
            await clearAllCaches();
            setAuthState(prev => ({ ...prev, loading: false, isAdmin: false }));
          } else if (wasAuthenticated && !authState.loading) { // Session became null unexpectedly
            logger.warn("AuthContext: Session unexpectedly became null. Attempting recovery...");
            setAuthState(prev => ({ ...prev, loading: true })); // Set loading for recovery attempt
            
            try {
              const { data: { session: recoveredSession }, error: recoveryError } = await supabase.auth.getSession();
              
              if (recoveryError) {
                logger.error("AuthContext: Session recovery - supabase.auth.getSession() error:", recoveryError);
                setAuthState(prev => ({ ...prev, loading: false, isAdmin: false })); // Recovery failed
              } else if (recoveredSession) {
                logger.info("AuthContext: Session recovery - Session recovered successfully. Re-validating.", { user_id: recoveredSession.user.id });
                // This will effectively trigger another onAuthStateChange with the recoveredSession,
                // or we can manually set the state here.
                // Forcing a re-evaluation by onAuthStateChange by setting the session and user.
                // The event 'TOKEN_REFRESHED' or 'SIGNED_IN' might be more appropriate if manually dispatching.
                // However, the simplest is to let the natural flow of onAuthStateChange handle it if it's re-triggered
                // by Supabase internals after getSession, or manually set it here.
                // Let's manually set and re-check admin role to avoid complex re-trigger logic.
                const recoveredUser = recoveredSession.user;
                setAuthState(prev => ({
                  ...prev,
                  user: recoveredUser,
                  session: recoveredSession,
                  isAuthenticated: true,
                  userExists: !!recoveredUser,
                  sessionExists: true,
                  // loading: true, // Keep loading true for admin check
                }));
                
                if (recoveredUser) {
                    const adminStatus = await checkAdminRoleWithRetry(recoveredUser.id, "SessionRecovery");
                    if (adminStatus !== null) {
                        setAuthState(prev => ({ ...prev, isAdmin: adminStatus, loading: false }));
                        logger.debug(`AuthContext: SessionRecovery - Admin status for recovered user: ${adminStatus}. Loading false.`);
                    } else {
                        logger.warn(`AuthContext: SessionRecovery - Could not determine admin status. isAdmin remains false. Loading false.`);
                        setAuthState(prev => ({ ...prev, loading: false })); // isAdmin already false
                    }
                } else {
                     setAuthState(prev => ({ ...prev, loading: false, isAdmin: false }));
                }
              } else {
                logger.warn("AuthContext: Session recovery - supabase.auth.getSession() returned null. User remains logged out.");
                setAuthState(prev => ({ ...prev, loading: false, isAdmin: false })); // Recovery failed, no session
              }
            } catch (e) {
              logger.error("AuthContext: Session recovery - Exception during supabase.auth.getSession():", e);
              setAuthState(prev => ({ ...prev, loading: false, isAdmin: false })); // Recovery failed
            }
          } else {
            logger.debug("AuthContext: Session is null, but not an unexpected scenario for recovery or already loading. Finalizing state.");
            setAuthState(prev => ({ ...prev, loading: false, isAdmin: false }));
          }
        }
        
        // Logging specific events after state has been handled by the main logic
        switch (_event) {
          case 'SIGNED_IN':
            logger.info("AuthContext: Event SIGNED_IN processed. User authenticated and admin status checked.");
            break;
          case 'SIGNED_OUT':
            logger.info("AuthContext: Event SIGNED_OUT processed. Caches cleared, user logged out.");
            break;
          case 'USER_DELETED':
            logger.info("AuthContext: Event USER_DELETED processed. Caches cleared.");
            break;
          case 'PASSWORD_RECOVERY':
            logger.info("AuthContext: Event PASSWORD_RECOVERY processed.");
            break;
          case 'TOKEN_REFRESHED':
            logger.info("AuthContext: Event TOKEN_REFRESHED processed. Session updated, admin status re-validated if user present.");
            break;
          case 'USER_UPDATED':
            logger.info("AuthContext: Event USER_UPDATED processed. Admin status re-validated if user present.");
            break;
          case 'MFA_CHALLENGE_VERIFIED':
            logger.info("AuthContext: Event MFA_CHALLENGE_VERIFIED processed.");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.isAuthenticated, authState.loading]); // Added dependencies to re-evaluate if recovery conditions change

  const clearAllCaches = async () => {
    try {
      logger.info('[AuthContext CacheClear] Starting cache clear process...');
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
      logger.info('[AuthContext CacheClear] Cache clear process completed.');
    } catch (error) {
      logger.error("AuthContext: Error clearing caches:", error);
      toast({ title: "Cache Clear Error", description: "Could not clear all application caches.", variant: "destructive" });
    }
  };

  const signOut = async () => {
    logger.info("AuthContext: signOut called.");
    setAuthState(prev => ({ ...prev, loading: true })); 
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('AuthContext: Error signing out:', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
      setAuthState(prev => ({ ...prev, loading: false })); 
    } else {
      logger.info("AuthContext: Sign out successful via supabase.auth.signOut(). onAuthStateChange will handle cache clearing and final state.");
      // onAuthStateChange will set loading to false and isAdmin to false due to event 'SIGNED_OUT'.
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
