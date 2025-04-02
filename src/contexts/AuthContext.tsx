// This file is automatically generated. Do not edit it directly.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  checkUserRole: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<any>;
  getNickname: () => Promise<string | null>;
  updateProfileImage: (imageUrl: string) => Promise<any>;
  getProfileImage: () => Promise<string | null>;
  getUserRole: () => Promise<string | null>;
  updateUserRole: (userId: string, role: string) => Promise<any>;
}

// Create context with undefined as initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check if user has a specific role
  const checkUserRole = async () => {
    try {
      if (!user || !user.id) {
        setIsAdmin(false);
        setUserRole(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking user role:', error);
        setIsAdmin(false);
        setUserRole(null);
        return;
      }

      setUserRole(data?.role || null);
      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAdmin(false);
      setUserRole(null);
    }
  };

  // User profile operations
  const updateNickname = async (nickname: string) => {
    try {
      if (!user) return { error: { message: 'No user logged in' } };
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', user.id);
      
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const getNickname = async () => {
    try {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      // If nickname doesn't exist in the schema, use email username as fallback
      if (data && !data.nickname && user.email) {
        return user.email.split('@')[0];
      }
      
      return data?.nickname || user.email?.split('@')[0] || null;
    } catch (error) {
      console.error('Error getting nickname:', error);
      return user?.email?.split('@')[0] || null;
    }
  };

  const updateProfileImage = async (imageUrl: string) => {
    try {
      if (!user) return { error: { message: 'No user logged in' } };
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('id', user.id);
      
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const getProfileImage = async () => {
    try {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data?.avatar_url || null;
    } catch (error) {
      console.error('Error getting profile image:', error);
      return null;
    }
  };

  const getUserRole = async () => {
    try {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error getting user role:', error);
        return 'Submissive'; // Default role
      }
      
      // Ensure first letter is capitalized
      const role = data?.role || 'Submissive';
      return role.charAt(0).toUpperCase() + role.slice(1);
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'Submissive'; // Default role
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      // Make sure the role is one of the allowed values
      let validRole = role;
      if (role !== 'admin' && role !== 'user') {
        validRole = 'user';
      }
      
      const { data, error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: validRole 
        }, { onConflict: 'user_id' });
      
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email:', email);
      
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        return { error: { message: 'Email and password are required' }, user: null };
      }
      
      console.log('Auth request details:', { email: trimmedEmail, passwordLength: trimmedPassword.length });
      
      // Clear any existing sessions to prevent issues
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error, user: null };
      }
      
      console.log('Sign in successful:', data.user?.email);
      return { error: null, user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Exception during sign in:', error);
      return { error, user: null };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        return { error: { message: 'Email and password are required' }, data: null };
      }
      
      if (trimmedPassword.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' }, data: null };
      }
      
      // Clear any existing session first
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error, data: null };
      }
      
      console.log('Sign up successful:', data.user?.email);
      toast({
        title: 'Registration successful',
        description: data.session ? 'You are now logged in.' : 'Please check your email to verify your account.',
      });
      
      return { error: null, data };
    } catch (error: any) {
      console.error('Exception during sign up:', error);
      return { error, data: null };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!trimmedEmail) {
        return { error: { message: 'Email is required' } };
      }
      
      const siteUrl = window.location.origin;
      
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error);
        return { error };
      }
      
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for the password reset link.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during password reset:', error);
      return { error };
    }
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    try {
      const trimmedPassword = newPassword.trim();
      
      if (!trimmedPassword) {
        return { error: { message: 'New password is required' } };
      }
      
      if (trimmedPassword.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' } };
      }
      
      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        return { error };
      }
      
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during password update:', error);
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      console.log('Signed out successfully');
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Setup authentication state listener
  useEffect(() => {
    console.log('Setting up auth state listener');
    setLoading(true);
    
    // First, setup the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log(`Auth state change: ${event}`, newSession?.user?.email);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user || null);
        setIsAuthenticated(!!newSession);
        
        if (newSession?.user) {
          // Use setTimeout to avoid potential auth deadlocks
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        console.log('User signed out');
      }
      
      setLoading(false);
    });
    
    // Then check for an existing session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        console.log('Initial session check:', currentSession?.user?.email || 'No session');
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);
          
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    session,
    loading,
    isAdmin,
    userRole,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    checkUserRole,
    updateNickname,
    getNickname,
    updateProfileImage,
    getProfileImage,
    getUserRole,
    updateUserRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
