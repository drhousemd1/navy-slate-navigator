import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/data/queryClient';
import localforage from 'localforage';
import { STORAGE_PREFIX as FORM_STATE_PREFIX } from '@/hooks/useFormStatePersister';
import { useAuthOperations } from './auth/useAuthOperations';
import { useUserProfile } from './auth/useUserProfile';

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
  getNickname: ReturnType<typeof useUserProfile>['getNickname'];
  getProfileImage: ReturnType<typeof useUserProfile>['getProfileImage'];
  getUserRole: ReturnType<typeof useUserProfile>['getUserRole'];
  updateNickname: ReturnType<typeof useUserProfile>['updateNickname'];
  updateProfileImage: ReturnType<typeof useUserProfile>['updateProfileImage'];
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
    console.log("AuthContext: Initializing, setting up listeners...");
    const checkInitialSession = async () => {
      console.log("AuthContext: Checking initial session...");
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("AuthContext: Error getting initial session:", error);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      console.log("AuthContext: Initial session data:", session);

      if (session) {
        const user = session.user;
        let isAdminRole = false; // Renamed to avoid conflict with authState.isAdmin
        if (user) {
          try {
            console.log("AuthContext: Initial session - User found, checking admin role for", user.id);
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              console.error("AuthContext: Initial session - Error checking admin role via RPC:", roleError);
            } else {
              isAdminRole = !!hasAdminRole;
            }
            console.log("AuthContext: Initial session - Is admin check result:", isAdminRole);
          } catch (e) {
            console.error("AuthContext: Initial session - Exception during admin role check:", e);
          }
        }
        setAuthState({
          user: user,
          session: session,
          loading: false,
          isAuthenticated: true,
          isAdmin: isAdminRole,
          userExists: !!user,
          sessionExists: !!session,
        });
        console.log("AuthContext: Initialized with active session. Current state:", {
          userExists: !!user,
          sessionExists: !!session,
          isAuthenticated: true,
          isAdmin: isAdminRole,
          loading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false, isAuthenticated: false, isAdmin: false, userExists: false, sessionExists: false }));
        console.log("AuthContext: Initialized. No active session.");
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', session) => {
        console.log("AuthContext: Auth state change event:", _event, "Session:", session);
        const user = session?.user ?? null;
        let eventIsAdminRole = false; // Renamed for clarity

        if (user) {
          try {
            console.log("AuthContext: Auth state change - User found, checking admin role for", user.id);
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              console.error("AuthContext: Auth state change - Error checking admin role via RPC:", roleError);
            } else {
              eventIsAdminRole = !!hasAdminRole;
            }
            console.log("AuthContext: Auth state change - Is admin check result:", eventIsAdminRole);
          } catch (e) {
            console.error("AuthContext: Auth state change - Error checking admin role:", e);
          }
        }
        
        setAuthState({
          user: user,
          session: session,
          loading: false,
          isAuthenticated: !!session,
          isAdmin: eventIsAdminRole,
          userExists: !!user,
          sessionExists: !!session,
        });
        console.log("AuthContext: State updated after auth event. New state:", {
            userExists: !!user,
            sessionExists: !!session,
            isAuthenticated: !!session,
            isAdmin: eventIsAdminRole,
            loading: false,
        });

        switch (_event) {
          case 'SIGNED_IN':
            console.log("AuthContext: Event SIGNED_IN processed.");
            break;
          case 'SIGNED_OUT':
            console.log("AuthContext: Event SIGNED_OUT processed. Clearing caches.");
            await clearAllCaches();
            break;
          case 'USER_DELETED':
            console.log("AuthContext: Event USER_DELETED processed. Clearing caches.");
            await clearAllCaches();
            break;
          case 'PASSWORD_RECOVERY':
            console.log("AuthContext: Event PASSWORD_RECOVERY processed.");
            break;
          case 'TOKEN_REFRESHED':
            console.log("AuthContext: Event TOKEN_REFRESHED processed. Session and admin role re-validated.");
            break;
          case 'USER_UPDATED':
            console.log("AuthContext: Event USER_UPDATED processed.");
            break;
          case 'MFA_CHALLENGE_VERIFIED':
            console.log("AuthContext: Event MFA_CHALLENGE_VERIFIED processed.");
            break;
          default:
            const unhandledEvent: string = _event as string; 
            console.log(`AuthContext: Unhandled auth event type: ${unhandledEvent}`);
            break;
        }
      }
    );

    return () => {
      console.log("AuthContext: Cleaning up auth subscription.");
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  const clearAllCaches = async () => {
    try {
      console.log('[AuthContext CacheClear] Starting cache clear process...');
      queryClient.clear();
      console.log('[AuthContext CacheClear] React Query in-memory cache cleared.');

      await localforage.removeItem('APP_QUERY_CACHE');
      console.log('[AuthContext CacheClear] Persisted React Query cache (APP_QUERY_CACHE) removed from localforage.');
      
      const keys = await localforage.keys();
      const formStateKeys = keys.filter(key => key.startsWith(FORM_STATE_PREFIX));
      for (const key of formStateKeys) {
        await localforage.removeItem(key);
      }
      console.log(`[AuthContext CacheClear] Cleared ${formStateKeys.length} persisted form drafts using prefix: ${FORM_STATE_PREFIX}`);
      
      toast({ title: "Cache Cleared", description: "Application cache and drafts have been cleared." });
      console.log('[AuthContext CacheClear] Cache clear process completed.');
    } catch (error) {
      console.error("AuthContext: Error clearing caches:", error);
      toast({ title: "Cache Clear Error", description: "Could not clear all application caches.", variant: "destructive" });
    }
  };

  const signOut = async () => {
    console.log("AuthContext: signOut called. Setting loading true.");
    setAuthState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('AuthContext: Error signing out:', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
      // State will be updated by onAuthStateChange, including setting loading to false
      // Set loading false here only if onAuthStateChange might not fire or to be defensive
      setAuthState(prev => ({ ...prev, loading: false })); 
    } else {
      console.log("AuthContext: Sign out successful via supabase.auth.signOut(). Waiting for onAuthStateChange for cache clearing and final state update.");
      // Cache clearing and final state update (including loading: false) is handled by the 'SIGNED_OUT' event in onAuthStateChange.
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    signIn: authOperations.signIn,
    signUp: authOperations.signUp,
    resetPassword: authOperations.resetPassword,
    updatePassword: authOperations.updatePassword,
    getNickname: userProfileUtils.getNickname,
    getProfileImage: userProfileUtils.getProfileImage,
    getUserRole: userProfileUtils.getUserRole,
    updateNickname: userProfileUtils.updateNickname,
    updateProfileImage: userProfileUtils.updateProfileImage,
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
