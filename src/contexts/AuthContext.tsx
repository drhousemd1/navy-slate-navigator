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
    console.log('[AuthContext] useEffect mounting. Setting up auth state listener.');
    const checkInitialSession = async () => {
      console.log('[AuthContext] checkInitialSession called.');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[AuthContext] Error getting initial session:", error);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      if (session) {
        const user = session.user;
        console.log('[AuthContext] Initial session found:', { userId: user?.id, expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : 'N/A' });
        let isAdmin = false;
        if (user) {
          try {
            console.log('[AuthContext] Checking admin role for initial session user:', user.id);
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              console.error("[AuthContext] Error checking admin role (initial session) via RPC:", roleError);
            } else {
              isAdmin = !!hasAdminRole;
              console.log("[AuthContext] Admin role (initial session) check result:", isAdmin);
            }
          } catch (e) {
            console.error("[AuthContext] Exception during admin role check (initial session):", e);
          }
        }
        setAuthState({
          user: user,
          session: session,
          loading: false,
          isAuthenticated: true,
          isAdmin: isAdmin,
          userExists: !!user,
          sessionExists: !!session,
        });
        console.log("[AuthContext] Initialized with session. Current state:", {
          userExists: !!user,
          sessionExists: !!session,
          isAuthenticated: true,
          isAdmin: isAdmin,
          loading: false,
        });
      } else {
        console.log('[AuthContext] No initial session found.');
        setAuthState(prev => ({ ...prev, loading: false, isAuthenticated: false, isAdmin: false, userExists: false, sessionExists: false }));
        console.log("[AuthContext] Initialized without session.");
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', session) => {
        console.log(`[AuthContext] onAuthStateChange event: ${_event}`, { sessionId: session?.user?.id, currentAuthStateUser: authState.user?.id });
        if (session) {
            console.log(`[AuthContext] Session details: Expires at ${new Date(session.expires_at * 1000)}, User ID: ${session.user.id}`);
        } else {
            console.log('[AuthContext] No session in this event.');
        }

        const user = session?.user ?? null;
        let isAdmin = false;

        if (user) {
          try {
            console.log('[AuthContext] Checking admin role for user in onAuthStateChange:', user.id);
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              console.error("[AuthContext] Error checking admin role (onAuthStateChange) via RPC:", roleError);
            } else {
              isAdmin = !!hasAdminRole;
               console.log("[AuthContext] Admin role (onAuthStateChange) check result:", isAdmin);
            }
          } catch (e) {
            console.error("[AuthContext] Exception during admin role check (onAuthStateChange):", e);
          }
        }
        
        setAuthState({
          user: user,
          session: session,
          loading: false,
          isAuthenticated: !!session,
          isAdmin: isAdmin,
          userExists: !!user,
          sessionExists: !!session,
        });

        switch (_event) {
          case 'SIGNED_IN':
            console.log("[AuthContext] Event: SIGNED_IN. User authenticated.", { userId: user?.id });
            break;
          case 'SIGNED_OUT':
            console.log("[AuthContext] Event: SIGNED_OUT. User signed out.");
            await clearAllCaches();
            break;
          case 'USER_DELETED':
            console.log("[AuthContext] Event: USER_DELETED.");
            await clearAllCaches();
            break;
          case 'PASSWORD_RECOVERY':
            console.log("[AuthContext] Event: PASSWORD_RECOVERY.");
            break;
          case 'TOKEN_REFRESHED':
            console.log("[AuthContext] Event: TOKEN_REFRESHED. Session token refreshed.", { newExpiry: session ? new Date(session.expires_at * 1000) : 'N/A' });
            break;
          case 'USER_UPDATED':
            console.log("[AuthContext] Event: USER_UPDATED.", { userId: user?.id });
            break;
          case 'MFA_CHALLENGE_VERIFIED':
            console.log("[AuthContext] Event: MFA_CHALLENGE_VERIFIED.");
            break;
          default:
            const unhandledEvent: string = _event as string; 
            console.log(`[AuthContext] Event: Unhandled - ${unhandledEvent}`);
            break;
        }
      }
    );

    return () => {
      console.log('[AuthContext] useEffect unmounting. Unsubscribing from auth state changes.');
      subscription?.unsubscribe();
    };
  }, []); // Removed authState from dependencies to prevent re-running on its own state changes

  const clearAllCaches = async () => {
    try {
      // Clear React Query in-memory cache
      queryClient.clear();
      console.log('[CacheClear] React Query in-memory cache cleared.');

      // Remove the persisted React Query cache from localforage
      // The key 'APP_QUERY_CACHE' should match the one used in AppProviders.tsx
      await localforage.removeItem('APP_QUERY_CACHE');
      console.log('[CacheClear] Persisted React Query cache (APP_QUERY_CACHE) removed from localforage.');
      
      // Clear persisted form drafts
      const keys = await localforage.keys();
      const formStateKeys = keys.filter(key => key.startsWith(FORM_STATE_PREFIX));
      for (const key of formStateKeys) {
        await localforage.removeItem(key);
      }
      console.log(`[CacheClear] Cleared ${formStateKeys.length} persisted form drafts using prefix: ${FORM_STATE_PREFIX}`);
      
      toast({ title: "Cache Cleared", description: "Application cache and drafts have been cleared." });
    } catch (error) {
      console.error("Error clearing caches:", error);
      toast({ title: "Cache Clear Error", description: "Could not clear all application caches.", variant: "destructive" });
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] signOut called.');
    setAuthState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[AuthContext] Error signing out:', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
      // State will be updated by onAuthStateChange 'SIGNED_OUT' event
      setAuthState(prev => ({ ...prev, loading: false })); // Explicitly set loading false here too
    } else {
      console.log("[AuthContext] Sign out successful via signOut call. Cache clearing handled by onAuthStateChange.");
      // onAuthStateChange will set loading to false and update auth state.
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
