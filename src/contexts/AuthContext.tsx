import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/data/queryClient';
import localforage from 'localforage';
import { STORAGE_PREFIX as FORM_STATE_PREFIX } from '@/hooks/useFormStatePersister';
import { useAuthOperations } from './auth/useAuthOperations';
import { useUserProfile } from './auth/useUserProfile';
import { PROFILE_POINTS_QUERY_KEY_BASE } from '@/data/points/usePointsManager';

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

  // Ref to store the last known authenticated user ID for cache management
  const lastAuthenticatedUserIdRef = useRef<string | null>(null);

  const clearAllCaches = async () => {
    try {
      // Clear React Query in-memory cache
      queryClient.clear(); // This clears everything including profile_points etc.
      console.log('[CacheClear] React Query in-memory cache cleared on user change or sign out.');

      await localforage.removeItem('APP_QUERY_CACHE'); // Key used by TanStack Query Persister
      console.log('[CacheClear] Persisted React Query cache (APP_QUERY_CACHE) removed from localforage.');
      
      const keys = await localforage.keys();
      const formStateKeys = keys.filter(key => key.startsWith(FORM_STATE_PREFIX));
      for (const key of formStateKeys) {
        await localforage.removeItem(key);
      }
      console.log(`[CacheClear] Cleared ${formStateKeys.length} persisted form drafts using prefix: ${FORM_STATE_PREFIX}`);
      
      toast({ title: "Cache Cleared", description: "User session changed. Application cache and drafts have been cleared." });
    } catch (error) {
      console.error("Error clearing caches:", error);
      toast({ title: "Cache Clear Error", description: "Could not clear all application caches.", variant: "destructive" });
    }
  };

  useEffect(() => {
    const checkInitialSession = async () => {
      console.log("AuthContext: Checking initial session...");
      setAuthState(prev => ({ ...prev, loading: true })); // Ensure loading is true
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting initial session:", error);
        setAuthState(prev => ({ ...prev, user: null, session: null, loading: false, isAuthenticated: false, isAdmin: false, userExists: false, sessionExists: false }));
        lastAuthenticatedUserIdRef.current = null;
        return;
      }

      const initialUser = session?.user ?? null;
      const initialUserId = initialUser?.id ?? null;
      let isAdmin = false;

      if (initialUser) {
        try {
          const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
            requested_user_id: initialUser.id,
            requested_role: 'admin'
          });
          isAdmin = roleError ? false : !!hasAdminRole;
        } catch (e) { console.error("Error during admin role check in initial session:", e); }
      }
      
      console.log(`AuthContext: Initial session check. User: ${initialUserId}, Last recorded user for cache: ${lastAuthenticatedUserIdRef.current}`);
      // If the user from the session is different from a potentially lingering ref value (e.g. from HMR),
      // or if there was a user and now there isn't (or vice-versa).
      // This specific check might be less critical if onAuthStateChange handles it robustly.
      // The main purpose of lastAuthenticatedUserIdRef is for transitions in onAuthStateChange.
      lastAuthenticatedUserIdRef.current = initialUserId; // Set the baseline

      setAuthState({
        user: initialUser,
        session: session,
        loading: false,
        isAuthenticated: !!session,
        isAdmin: isAdmin,
        userExists: !!initialUser,
        sessionExists: !!session,
      });
      console.log("AuthContext: Initial session processed. Loading false.");
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent | 'USER_DELETED', session) => {
        console.log(`AuthContext: Auth state change event: ${_event}`);
        setAuthState(prev => ({ ...prev, loading: true })); // Set loading true during transition

        const newUser = session?.user ?? null;
        const newUserId = newUser?.id ?? null;
        let newIsAdmin = false;

        if (newUserId !== lastAuthenticatedUserIdRef.current) {
          console.warn(`AuthContext: User identity changed. Previous: ${lastAuthenticatedUserIdRef.current}, New: ${newUserId}. Event: ${_event}. Clearing all caches.`);
          await clearAllCaches();
        }
        lastAuthenticatedUserIdRef.current = newUserId;

        if (newUser) {
          try {
            const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
              requested_user_id: newUser.id,
              requested_role: 'admin'
            });
            newIsAdmin = roleError ? false : !!hasAdminRole;
          } catch (e) { console.error("Error checking admin role on auth state change:", e); }
        }
        
        setAuthState({
          user: newUser,
          session: session,
          loading: false, // Set loading false after processing
          isAuthenticated: !!session,
          isAdmin: newIsAdmin,
          userExists: !!newUser,
          sessionExists: !!session,
        });
        console.log(`AuthContext: Auth state updated. User: ${newUserId}, Event: ${_event}. Loading false.`);

        // Cache clearing for SIGNED_OUT/USER_DELETED is now handled by the userId change logic above,
        // but keeping explicit calls in switch can be a fallback.
        // The userId check is more comprehensive for any kind of user switch.
        // switch (_event) {
        //   case 'SIGNED_OUT':
        //   case 'USER_DELETED':
        //     // clearAllCaches() already called if userId changed to null
        //     break;
        // // ... other cases
        // }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array, clearAllCaches is stable due to useRef/useState

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    console.log("AuthContext: Signing out...");
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
      setAuthState(prev => ({ ...prev, loading: false })); // Reset loading on error
    } else {
      // onAuthStateChange with SIGNED_OUT (and newUserId being null) will trigger clearAllCaches.
      console.log("AuthContext: Sign out successful. AuthStateChange handler will clear caches.");
      // No need to set loading: false here, onAuthStateChange will do it.
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
