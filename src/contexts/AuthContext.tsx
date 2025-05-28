import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
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
  
  // Add a ref to track ongoing admin role checks to prevent duplicate calls
  const adminCheckInProgress = useRef(false);

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
    let subscriptionCleanup: Subscription | null = null;

    const checkAdminRoleWithRetry = async (userId: string, context: string, attempt = 1): Promise<boolean | null> => {
      if (adminCheckInProgress.current) {
        logger.debug(`AuthContext: [${context}] Admin check already in progress, skipping duplicate call`);
        return null;
      }
      
      adminCheckInProgress.current = true;
      
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
            adminCheckInProgress.current = false;
            return await checkAdminRoleWithRetry(userId, context, attempt + 1);
          }
          adminCheckInProgress.current = false;
          return null;
        }
        
        logger.debug(`AuthContext: [${context}] Async admin role check (Attempt ${attempt}) successful. Admin: ${!!hasAdminRole}`);
        adminCheckInProgress.current = false;
        return !!hasAdminRole;
      } catch (e) {
        logger.error(`AuthContext: [${context}] Exception during async admin role check (Attempt ${attempt}):`, e);
        if (attempt < MAX_ADMIN_CHECK_RETRIES) {
          logger.info(`AuthContext: [${context}] Retrying admin role check (Attempt ${attempt + 1}) after exception and delay.`);
          await new Promise(resolve => setTimeout(resolve, ADMIN_CHECK_RETRY_DELAY_MS));
          adminCheckInProgress.current = false;
          return await checkAdminRoleWithRetry(userId, context, attempt + 1);
        }
        adminCheckInProgress.current = false;
        return null;
      }
    };

    const checkInitialSession = async () => {
      logger.debug("AuthContext: Checking initial session...");
      try {
        const { data: { session: initialSupabaseSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error("AuthContext: Error getting initial session:", sessionError);
          setAuthState(prev => ({ ...prev, loading: false }));
          return;
        }

        logger.debug("AuthContext: Initial session data from Supabase:", initialSupabaseSession ? { user_id: initialSupabaseSession.user.id, expires_at: initialSupabaseSession.expires_at } : null);
        const user = initialSupabaseSession?.user ?? null;
        
        // Batch update state once with new session info
        setAuthState(prev => ({
          ...prev,
          user: user,
          session: initialSupabaseSession,
          isAuthenticated: !!initialSupabaseSession,
          userExists: !!user,
          sessionExists: !!initialSupabaseSession,
          // Keep loading true until admin check completes
        }));
        
        if (user) {
          const adminStatus = await checkAdminRoleWithRetry(user.id, "InitialSession");
          // Final state update with admin status and loading false
          setAuthState(prev => ({ 
            ...prev, 
            isAdmin: adminStatus !== null ? adminStatus : false, 
            loading: false 
          }));
          logger.debug(`AuthContext: Initial session - Final admin status after check/retry set to: ${adminStatus}. Loading false.`);
        } else {
          setAuthState(prev => ({ ...prev, loading: false, isAdmin: false }));
          logger.debug("AuthContext: Initial session - No user. Loading false, isAdmin false.");
        }
      } catch (e) {
        logger.error("AuthContext: Exception during initial session check:", e);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    // Set up the auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', newSessionState: Session | null) => {
        logger.debug(`AuthContext: Auth state change event: ${_event}`, "New Session State:", newSessionState ? { user_id: newSessionState.user.id, expires_at: newSessionState.expires_at, event: _event } : { event: _event });
        
        // Capture previous state for comparison
        const wasAuthenticated = authState.isAuthenticated;

        if (newSessionState) {
          const user = newSessionState.user;
          
          // Batch update state once with new session info
          setAuthState(prev => ({
            ...prev,
            user: user,
            session: newSessionState,
            isAuthenticated: true,
            userExists: !!user,
            sessionExists: true,
            // Preserve loading state until admin check completes
          }));
          
          logger.debug("AuthContext: State updated for new session. Current state (before admin check):", {
            userExists: !!user,
            sessionExists: true,
            isAuthenticated: true,
            loading: true,
          });

          if (user) {
            // Perform admin check asynchronously but don't block UI
            setTimeout(async () => {
              const adminStatus = await checkAdminRoleWithRetry(user.id, `AuthStateChange-${_event}`);
              // Final state update with admin status and loading false
              setAuthState(prev => ({
                ...prev,
                isAdmin: adminStatus !== null ? adminStatus : false,
                loading: false
              }));
              logger.debug(`AuthContext: AuthStateChange-${_event} - Admin status updated to: ${adminStatus}. Loading false.`);
            }, 0);
          } else {
            setAuthState(prev => ({ ...prev, isAdmin: false, loading: false }));
          }
        } else { // newSessionState is null
          logger.debug("AuthContext: Session became null.", { event: _event, wasAuthenticated });
          
          // For sign out or user deletion, clear everything immediately
          if (_event === 'SIGNED_OUT' || _event === 'USER_DELETED') {
            logger.info(`AuthContext: Explicit ${_event}. Clearing caches and finalizing.`);
            // First update state to reflect logout
            setAuthState({
              user: null,
              session: null,
              loading: true, // Stay loading until cache clear completes
              isAuthenticated: false,
              isAdmin: false,
              userExists: false,
              sessionExists: false,
            });
            
            // Then clear caches asynchronously
            await clearAllCaches();
            
            // Final update to stop loading
            setAuthState(prev => ({ ...prev, loading: false }));
          } else if (wasAuthenticated) { // Session became null unexpectedly
            logger.warn("AuthContext: Session unexpectedly became null. Attempting recovery...");
            
            try {
              const { data: { session: recoveredSession }, error: recoveryError } = await supabase.auth.getSession();
              
              if (recoveryError) {
                logger.error("AuthContext: Session recovery - supabase.auth.getSession() error:", recoveryError);
                setAuthState({
                  user: null,
                  session: null,
                  loading: false,
                  isAuthenticated: false,
                  isAdmin: false,
                  userExists: false,
                  sessionExists: false,
                });
              } else if (recoveredSession) {
                logger.info("AuthContext: Session recovery - Session recovered successfully.", { user_id: recoveredSession.user.id });
                const recoveredUser = recoveredSession.user;
                
                // Batch update with recovered session
                setAuthState({
                  user: recoveredUser,
                  session: recoveredSession,
                  loading: true,
                  isAuthenticated: true,
                  isAdmin: false, // Will update after admin check
                  userExists: !!recoveredUser,
                  sessionExists: true,
                });
                
                // Check admin status and update final state
                if (recoveredUser) {
                  const adminStatus = await checkAdminRoleWithRetry(recoveredUser.id, "SessionRecovery");
                  setAuthState(prev => ({ 
                    ...prev, 
                    isAdmin: adminStatus !== null ? adminStatus : false,
                    loading: false 
                  }));
                  logger.debug(`AuthContext: SessionRecovery - Admin status for recovered user: ${adminStatus}. Loading false.`);
                } else {
                  setAuthState(prev => ({ ...prev, loading: false }));
                }
              } else {
                logger.warn("AuthContext: Session recovery - supabase.auth.getSession() returned null. User remains logged out.");
                setAuthState({
                  user: null,
                  session: null,
                  loading: false,
                  isAuthenticated: false,
                  isAdmin: false,
                  userExists: false,
                  sessionExists: false,
                });
              }
            } catch (e) {
              logger.error("AuthContext: Session recovery - Exception during supabase.auth.getSession():", e);
              setAuthState({
                user: null,
                session: null,
                loading: false,
                isAuthenticated: false,
                isAdmin: false,
                userExists: false,
                sessionExists: false,
              });
            }
          } else {
            logger.debug("AuthContext: Session is null, but not an unexpected scenario for recovery. Finalizing state.");
            setAuthState({
              user: null,
              session: null,
              loading: false,
              isAuthenticated: false,
              isAdmin: false,
              userExists: false,
              sessionExists: false,
            });
          }
        }
        
        // Logging specific events
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
    
    subscriptionCleanup = subscription;

    // Then check for existing session
    checkInitialSession();

    return () => {
      logger.debug("AuthContext: Cleaning up auth subscription.");
      subscriptionCleanup?.unsubscribe();
    };
  }, []); // Remove dependencies that cause re-initialization

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
