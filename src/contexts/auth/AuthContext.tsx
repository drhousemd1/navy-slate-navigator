
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase, clearAuthState } from '@/integrations/supabase/client';
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

  // We use the static supabase client imported directly to avoid recreations

  // Hooks for auth and profile operations - use the static client implicitly now
  const { signIn: authSignIn, signUp: authSignUp, resetPassword: authResetPassword, updatePassword: authUpdatePassword } = useAuthOperations();
  const { updateNickname: profileUpdateNickname, getNickname, updateProfileImage: profileUpdateProfileImage, getProfileImage, getUserRole } = useUserProfile(user, setUser);

  const checkUserRole = useCallback(async () => {
    try {
      if (user) {
        // Use user_metadata role safely
        const role = user.user_metadata?.role;
        setIsAdmin(role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setIsAdmin(false);
    }
  }, [user]);

  // This useEffect sets up the auth state change listener and hydrates session once
  useEffect(() => {
    setLoading(true);
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      const userFromSession = newSession?.user ?? null;

      console.log('Auth state changed:', event);

      // Synchronous state update only here - no async calls
      setSession(newSession);
      setUser(userFromSession);
      setIsAuthenticated(!!userFromSession);

      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setLoading(false);
        navigate('/auth');
        return;
      }

      if (userFromSession) {
        // Defer async checkUserRole to avoid blocking UI
        setTimeout(() => {
          checkUserRole();
        }, 0);
      }

      // Set loading false after all state is updated once
      if (event !== 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    // Immediately hydrate on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      // Defensive unsubscribe if available
      if (typeof data?.subscription?.unsubscribe === 'function') {
        data.subscription.unsubscribe();
      }
    };
  }, [navigate, checkUserRole]);

  // signIn updates rememberMe locally then signs in with the static client
  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    try {
      localStorage.setItem('rememberMe', rememberMe.toString());
    } catch {
      // ignore storage errors
    }

    const result = await authSignIn(email, password, rememberMe);
    if (!result.error && result.user && result.session) {
      setUser(result.user);
      setSession(result.session);
      setIsAuthenticated(true);
      await checkUserRole();
    }
    return result;
  };

  const signUp = async (email: string, password: string) => {
    const result = await authSignUp(email, password);
    if (!result.error && result.data?.user && result.data?.session) {
      setUser(result.data.user);
      setSession(result.data.session);
      setIsAuthenticated(true);
      await checkUserRole();
    }
    return result;
  };

  const signOut = async () => {
    try {
      await clearAuthState();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign-out error:', error);
        throw error;
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

  // Wrappers to expose profile / auth related methods
  const resetPassword = (email: string) => authResetPassword(email);
  const updatePassword = (newPassword: string) => authUpdatePassword(newPassword);
  const updateNickname = (nickname: string) => profileUpdateNickname(nickname);
  const updateProfileImage = (imageUrl: string) => profileUpdateProfileImage(imageUrl);

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
