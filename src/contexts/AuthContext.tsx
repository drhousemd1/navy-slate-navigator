import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/data/queryClient';
import localforage from 'localforage';
import { FORM_STATE_PREFIX } from '@/hooks/useFormStatePersister';
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
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    if (prev.user !== updatedUser) {
      setAuthState(prev => ({ ...prev, userExists: !!updatedUser }));
    }
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
            if (roleError) throw roleError;
            isAdmin = !!hasAdminRole;
            console.log("Is admin check result:", isAdmin);
          } catch (e) {
            console.error("Error checking admin role:", e);
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
      async (_event: AuthChangeEvent, session) => {
        console.log("Auth state change event:", _event);
        const user = session?.user ?? null;
        let isAdmin = false;

        if (user) {
          try {
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: user.id,
              requested_role: 'admin'
            });
            if (roleError) throw roleError;
            isAdmin = !!hasAdminRole;
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

        if (_event === 'SIGNED_IN') {
          console.log("Auth state: User session detected");
        } else if (_event === 'SIGNED_OUT') {
          console.log("Auth state: User signed out");
          await clearAllCaches();
        } else if (_event === 'USER_DELETED') {
          console.log("Auth state: User deleted");
          await clearAllCaches();
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const clearAllCaches = async () => {
    try {
      queryClient.clear();
      console.log('[CacheClear] React Query in-memory cache cleared.');

      await localforage.removeItem('RQ_CACHE');
      console.log('[CacheClear] Persisted React Query cache (RQ_CACHE) cleared.');

      const keys = await localforage.keys();
      const formStateKeys = keys.filter(key => key.startsWith(FORM_STATE_PREFIX));
      for (const key of formStateKeys) {
        await localforage.removeItem(key);
      }
      console.log(`[CacheClear] Cleared ${formStateKeys.length} persisted form drafts.`);
      
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
      await clearAllCaches();
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
