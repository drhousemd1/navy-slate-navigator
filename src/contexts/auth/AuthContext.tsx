
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase, clearAuthState, initializeSupabaseClient } from '@/integrations/supabase/client';
import { useAuthOperations } from './useAuthOperations';
import { useUserProfile } from './useUserProfile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  getNickname: () => string | null;
  getProfileImage: () => string | null;
  getUserRole: () => string;
  checkUserRole: () => Promise<void>;
  updateNickname: (nickname: string) => void;
  updateProfileImage: (imageUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Load 'rememberMe' flag from localStorage once during initialization
  const [initialized, setInitialized] = React.useState(false);
  const [client, setClient] = React.useState(supabase);

  // Update client based on rememberMe before mounting listeners
  useEffect(() => {
    let rememberMeFlag = false;
    try {
      rememberMeFlag = localStorage.getItem('rememberMe') === 'true';
    } catch {
      rememberMeFlag = false;
    }
    // Initialize supabase client with persistSession set accordingly
    const initializedClient = initializeSupabaseClient(rememberMeFlag);
    setClient(initializedClient);
    setInitialized(true);
  }, []);

  // Hooks for auth and profile operations use the client instance, so override the hooks after client is ready
  const { signIn: authSignIn, signUp: authSignUp, resetPassword: authResetPassword, updatePassword: authUpdatePassword } = useAuthOperations();
  const { updateNickname: profileUpdateNickname, getNickname, updateProfileImage: profileUpdateProfileImage, getProfileImage, getUserRole } = useUserProfile(user, setUser);

  // Function to check user admin role
  const checkUserRole = async () => {
    try {
      if (user) {
        const role = user.user_metadata?.role;
        setIsAdmin(role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    // Update the rememberMe flag in localStorage and re-initialize supabase client accordingly
    try {
      localStorage.setItem('rememberMe', rememberMe.toString());
    } catch {}

    // Reinitialize supabase client with the updated persistence
    const newClient = initializeSupabaseClient(rememberMe);
    setClient(newClient);

    const result = await authSignIn(email, password, rememberMe);
    if (!result.error && result.user && result.session) {
      setUser(result.user);
      setSession(result.session);
      setIsAuthenticated(true);
      checkUserRole();
    }
    return result;
  };

  const signUp = async (email: string, password: string) => {
    const result = await authSignUp(email, password);
    if (!result.error && result.data?.user && result.data?.session) {
      setUser(result.data.user);
      setSession(result.data.session);
      setIsAuthenticated(true);
      checkUserRole();
    }
    return result;
  };

  const signOut = async () => {
    try {
      await clearAuthState();

      if (client.auth) {
        // Use client signOut method
        const { error } = await client.auth.signOut();
        if (error) {
          console.error('Sign-out error:', error);
          throw error;
        }
      } else {
        console.error('Supabase client auth not initialized.');
      }

      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setLoading(false);

      navigate('/auth');
    } catch (error: any) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };

  // Wrapper functions for reset and update password
  const resetPassword = (email: string) => authResetPassword(email);
  const updatePassword = (newPassword: string) => authUpdatePassword(newPassword);
  const updateNickname = (nickname: string) => profileUpdateNickname(nickname);
  const updateProfileImage = (imageUrl: string) => profileUpdateProfileImage(imageUrl);

  useEffect(() => {
    if (!initialized) {
      return; // don't initialize the listener until client is ready
    }

    setLoading(true);

    // Set up the auth state change listener
    const { data } = client.auth.onAuthStateChange((event, newSession) => {
      // Synchronous updates only here to avoid deadlocks
      const userFromSession = newSession?.user ?? null;

      console.log('Auth state changed:', event);

      setSession(newSession);
      setUser(userFromSession);
      setIsAuthenticated(!!userFromSession);

      // Reset isAdmin and loading on SIGNED_OUT immediately
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setLoading(false);
        navigate('/auth');
      }

      // Defer calls that require async side effects outside callback
      if (userFromSession) {
        setTimeout(() => {
          checkUserRole();
        }, 0);
      }

      // We unify loading state change here to prevent multiple setLoading calls and reduce re-renders
      if (event !== 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    // Get the current session on mount, setting state
    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      if (session?.user) {
        checkUserRole();
      }
      setLoading(false);
    }).catch(e => {
      console.error('Error getting session:', e);
      setLoading(false);
    });

    return () => {
      // Defensive: unsubscribe can be undefined in some supabase versions, check type
      if (typeof data?.subscription?.unsubscribe === 'function') {
        data.subscription.unsubscribe();
      }
    };
  }, [client, initialized, navigate]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      isAdmin,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      getNickname,
      getProfileImage,
      getUserRole,
      checkUserRole,
      updateNickname,
      updateProfileImage,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
