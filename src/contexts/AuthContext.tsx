
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
  checkAdminStatus: () => Promise<boolean>;
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

  // On-demand admin check function
  const checkAdminStatus = async (): Promise<boolean> => {
    if (!authState.user) return false;
    
    try {
      const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
        requested_user_id: authState.user.id,
        requested_role: 'admin'
      });
      
      if (error) {
        logger.error('Error checking admin role:', error);
        return false;
      }
      
      const isAdmin = !!hasAdminRole;
      setAuthState(prev => ({ ...prev, isAdmin }));
      return isAdmin;
    } catch (e) {
      logger.error('Exception during admin role check:', e);
      return false;
    }
  };

  useEffect(() => {
    logger.debug("AuthContext: Starting instant auth check...");
    let subscriptionCleanup: Subscription | null = null;

    const initializeAuth = async () => {
      try {
        // Set up auth state change listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, newSession: Session | null) => {
            logger.debug(`AuthContext: Auth state change: ${event}`);
            
            if (newSession) {
              // User is authenticated - set state immediately
              setAuthState({
                user: newSession.user,
                session: newSession,
                loading: false,
                isAuthenticated: true,
                isAdmin: false, // Will be checked on-demand only
                userExists: true,
                sessionExists: true,
              });
              
              logger.debug("AuthContext: User authenticated, app ready");
            } else {
              // User is not authenticated
              if (event === 'SIGNED_OUT') {
                logger.info(`AuthContext: ${event} - clearing caches`);
                await clearAllCaches();
              }
              
              setAuthState({
                user: null,
                session: null,
                loading: false,
                isAuthenticated: false,
                isAdmin: false,
                userExists: false,
                sessionExists: false,
              });
              
              logger.debug("AuthContext: User not authenticated");
            }
          }
        );
        
        subscriptionCleanup = subscription;

        // Check for existing session - this should be instant from localStorage
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error("AuthContext: Error getting session:", error);
          setAuthState(prev => ({ ...prev, loading: false }));
          return;
        }

        if (existingSession) {
          // User has existing session - set immediately
          setAuthState({
            user: existingSession.user,
            session: existingSession,
            loading: false,
            isAuthenticated: true,
            isAdmin: false, // Will be checked on-demand only
            userExists: true,
            sessionExists: true,
          });
          
          logger.debug("AuthContext: Existing session found, app ready");
        } else {
          // No session - stop loading immediately
          setAuthState(prev => ({ ...prev, loading: false }));
          logger.debug("AuthContext: No existing session, app ready");
        }

      } catch (e) {
        logger.error("AuthContext: Exception during initialization:", e);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();

    return () => {
      logger.debug("AuthContext: Cleaning up auth subscription");
      subscriptionCleanup?.unsubscribe();
    };
  }, []);

  const clearAllCaches = async () => {
    try {
      logger.info('[AuthContext] Starting cache clear...');
      queryClient.clear();
      
      await localforage.removeItem('APP_QUERY_CACHE');
      
      const keys = await localforage.keys();
      const formStateKeys = keys.filter(key => key.startsWith(FORM_STATE_PREFIX));
      for (const key of formStateKeys) {
        await localforage.removeItem(key);
      }
      
      toast({ title: "Cache Cleared", description: "Application cache cleared." });
      logger.info('[AuthContext] Cache clear completed');
    } catch (error) {
      logger.error("AuthContext: Error clearing caches:", error);
    }
  };

  const signOut = async () => {
    logger.info("AuthContext: signOut called");
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('AuthContext: Error signing out:', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
    } else {
      logger.info("AuthContext: Sign out successful");
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
    checkAdminStatus,
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
