import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/data/queryClient'; // Import queryClient
import localforage from 'localforage'; // Import localforage
import { FORM_STATE_PREFIX } from '@/hooks/useFormStatePersister'; // Import the prefix

// Define the structure of the authentication state
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userExists: boolean; // Added to track if user profile exists
  sessionExists: boolean; // Added to track if session exists
}

// Define the structure of the authentication context
interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  // Add other auth methods if needed, e.g., signIn, signUp
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
              requested_role: 'admin' // Assuming 'admin' is the role name in your app_role enum
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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
        // The cache clear is now part of the signOut function
      } else if (_event === 'USER_DELETED') {
        console.log("Auth state: User deleted");
        // Also clear cache if user is deleted externally
        await clearAllCaches();
      }
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, []);
  
  const clearAllCaches = async () => {
    try {
      // 1. Clear React Query in-memory cache
      queryClient.clear();
      console.log('[CacheClear] React Query in-memory cache cleared.');

      // 2. Clear persisted React Query cache (using the key from App.tsx)
      await localforage.removeItem('RQ_CACHE');
      console.log('[CacheClear] Persisted React Query cache (RQ_CACHE) cleared.');

      // 3. Clear all form state drafts persisted by useFormStatePersister
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
      // Auth state change listener will update user, session, isAuthenticated, etc.
      // Perform cache clearing after successful Supabase sign out.
      await clearAllCaches(); 
      
      // Toast for sign out is good, let auth listener handle state updates.
      // No need to manually set isAuthenticated to false here, listener does it.
      // toast({ title: "Signed Out", description: "You have been successfully signed out." });
      // setAuthState(prev => ({ ...prev, loading: false })); // Listener will set loading eventually
    }
    // setLoading will be handled by the auth state listener setting the final state
  };

  return (
    <AuthContext.Provider value={{ ...authState, signOut }}>
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
