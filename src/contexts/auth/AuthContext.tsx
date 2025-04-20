
import React, { createContext, useState, useEffect, useContext } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    signIn: authSignIn,
    signUp: authSignUp,
    resetPassword: authResetPassword,
    updatePassword: authUpdatePassword,
  } = useAuthOperations();

  const {
    updateNickname: profileUpdateNickname,
    getNickname,
    updateProfileImage: profileUpdateProfileImage,
    getProfileImage,
    getUserRole,
  } = useUserProfile(user, setUser);

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    const result = await authSignIn(email, password, rememberMe);

    if (!result.error && result.user && result.session) {
      setUser(result.user);
      setSession(result.session);
      setIsAuthenticated(true);
      // Navigation moved to effect
    }
    return result;
  };

  const signUp = async (email: string, password: string) => {
    const result = await authSignUp(email, password);
    if (!result.error && result.data?.user && result.data?.session) {
      setUser(result.data.user);
      setSession(result.data.session);
      setIsAuthenticated(true);
      // Navigation moved to effect
    }
    return result;
  };

  const signOut = async () => {
    try {
      await clearAuthState();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      // Navigate to auth page moved to effect
    } catch (error) {
      throw error;
    }
  };

  const checkUserRole = async () => {
    if (user) {
      const { data: updatedUser, error: userError } = await supabase.auth.getUser();
      if (userError) {
        setIsAdmin(false);
        return;
      }
      const role = updatedUser.user?.user_metadata?.role;
      setIsAdmin(role === 'admin');
    } else {
      setIsAdmin(false);
    }
  };

  const resetPassword = (email: string) => authResetPassword(email);
  const updatePassword = (newPassword: string) => authUpdatePassword(newPassword);
  const updateNickname = (nickname: string) => profileUpdateNickname(nickname);
  const updateProfileImage = (imageUrl: string) => profileUpdateProfileImage(imageUrl);

  useEffect(() => {
    setLoading(true);
    // Setup auth state listener FIRST - synchronous updates only
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsAuthenticated(!!newSession);
      setLoading(false);
      // Do NOT call navigate here
    });

    // THEN get existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Separate effect for navigation after login/logout
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        navigate('/');
      } else {
        navigate('/auth');
      }
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      checkUserRole();
    } else {
      setIsAdmin(false);
    }
  }, [isAuthenticated, user]);

  const value: AuthContextType = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
