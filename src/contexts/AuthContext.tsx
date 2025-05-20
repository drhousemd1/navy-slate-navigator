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
    const checkInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting initial session:", error);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      if (session) {
        const user = session.user;
        let isAdmin = false;
        if (user) {
          try {
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              console.error("Error checking admin role via RPC:", roleError);
            } else {
              isAdmin = !!hasAdminRole;
            }
            console.log("Is admin check result:", isAdmin);
          } catch (e) {
            console.error("Error during admin role check:", e);
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
        console.log("AuthContext initialized. Current state:", {
          userExists: !!user,
          sessionExists: !!session,
          isAuthenticated: true,
          isAdmin: isAdmin,
          loading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false, isAuthenticated: false, isAdmin: false, userExists: false, sessionExists: false }));
        console.log("AuthContext initialized. No active session.");
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', session) => {
        console.log("Auth state change event:", _event, "Session:", session);
        const user = session?.user ?? null;
        let isAdmin = false;

        if (user) {
          try {
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) {
              console.error("Error checking admin role on auth state change via RPC:", roleError);
            } else {
              isAdmin = !!hasAdminRole;
            }
          } catch (e) {
            console.error("Error checking admin role on auth state change:", e);
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
            console.log("Auth state: User session detected (SIGNED_IN)");
            break;
          case 'SIGNED_OUT':
            console.log("Auth state: User signed out (SIGNED_OUT)");
            await clearAllCaches();
            break;
          case 'USER_DELETED':
            console.log("Auth state: User deleted (USER_DELETED)");
            await clearAllCaches();
            break;
          case 'PASSWORD_RECOVERY':
            console.log("Auth state: Password recovery initiated (PASSWORD_RECOVERY)");
            break;
          case 'TOKEN_REFRESHED':
            console.log("Auth state: Token refreshed (TOKEN_REFRESHED)");
            break;
          case 'USER_UPDATED':
            console.log("Auth state: User updated (USER_UPDATED)");
            break;
          case 'MFA_CHALLENGE_VERIFIED':
            console.log("Auth state: MFA challenge verified (MFA_CHALLENGE_VERIFIED)");
            break;
          default:
            const unhandledEvent: string = _event as string; // Cast to string to handle any value
            console.log(`Auth state change: Unhandled event type: ${unhandledEvent}`);
            break;
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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
      
      // Optionally, if there's other app-specific data in localforage that needs clearing on logout,
      // you could call localforage.clear() here, but be cautious as it wipes everything.
      // For now, targeted removal is safer.

      toast({ title: "Cache Cleared", description: "Application cache and drafts have been cleared." });
    } catch (error) {
      console.error("Error clearing caches:", error);
      toast({ title: "Cache Clear Error", description: "Could not clear all application caches.", variant: "destructive" });
    }
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
      setAuthState(prev => ({ ...prev, loading: false }));
    } else {
      // clearAllCaches is already called by the onAuthStateChange 'SIGNED_OUT' event handler.
      // Calling it here again would be redundant but generally harmless.
      // To avoid double calls, we can rely on the event handler.
      // If immediate clearing before state update is critical, keep it here and ensure handler is idempotent.
      // For now, relying on the event handler is cleaner.
      console.log("Sign out successful, cache clearing handled by onAuthStateChange.");
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
