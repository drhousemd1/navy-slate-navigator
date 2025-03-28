
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Session, User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'user';

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null; data: any | null }>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  userRole: UserRole | null;
  checkUserRole: () => Promise<void>;
  updateNickname: (nickname: string) => void;
  getNickname: () => string;
  updateProfileImage: (imageUrl: string) => void;
  getProfileImage: () => string;
  getUserRole: () => string;
  updateUserRole: (role: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // This function checks if the user has an admin role
  const checkUserRole = async () => {
    if (!user) {
      setUserRole(null);
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data) {
        setUserRole(data.role as UserRole);
        setIsAdmin(data.role === 'admin');
      } else {
        // Default to user role if no specific role is found
        setUserRole('user');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  // Set up auth state listener and check for existing session
  useEffect(() => {
    // CRITICAL: Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email);
        
        // Update authentication state synchronously
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsAuthenticated(!!currentSession);
        
        // Use setTimeout for any Supabase calls to prevent deadlocks
        if (currentSession?.user) {
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('Initial session check:', currentSession?.user?.email || 'No session');
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsAuthenticated(!!currentSession);
      
      if (currentSession?.user) {
        checkUserRole();
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      console.log('Sign in successful:', data.user?.email);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during sign in:', error);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign up error:', error);
        toast({
          title: 'Registration failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error, data: null };
      }
      
      console.log('Sign up successful:', data.user?.email);
      toast({
        title: 'Registration successful',
        description: 'Please check your email to verify your account.',
      });
      
      return { error: null, data };
    } catch (error: any) {
      console.error('Exception during sign up:', error);
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error, data: null };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/profile?reset-password=true',
      });
      
      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: 'Password reset failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      console.log('Password reset email sent to:', email);
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for the password reset link.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during password reset:', error);
      toast({
        title: 'Password reset failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setIsAdmin(false);
      
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

  // Update user nickname
  const updateNickname = (nickname: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          nickname
        }
      };
      setUser(updatedUser);
    }
  };

  // Update user profile image
  const updateProfileImage = (imageUrl: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          avatar_url: imageUrl
        }
      };
      setUser(updatedUser);
    }
  };

  // Get user nickname
  const getNickname = (): string => {
    if (!user) return 'Guest';
    
    if (user.user_metadata?.nickname) {
      return user.user_metadata.nickname;
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  };

  // Get user profile image
  const getProfileImage = (): string => {
    if (!user) return '';
    return user.user_metadata?.avatar_url || '';
  };

  // Get user role
  const getUserRole = (): string => {
    if (!user) return 'Submissive'; // Default role with proper capitalization
    
    // Get the role from metadata and ensure it's properly capitalized
    const role = user.user_metadata?.role || 'Submissive';
    
    // Ensure first letter is capitalized (in case it's stored lowercase in the database)
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Update user role
  const updateUserRole = async (role: string) => {
    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: { 
            role 
          }
        });
        
        if (error) {
          console.error('Error updating user role:', error);
          toast({
            title: 'Error updating role',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }
        
        const updatedUser = {
          ...user,
          user_metadata: {
            ...(user.user_metadata || {}),
            role
          }
        };
        setUser(updatedUser);
        
        toast({
          title: 'Role updated',
          description: `Your role has been updated to ${role}`,
        });
      } catch (error: any) {
        console.error('Exception during user role update:', error);
        toast({
          title: 'Error updating role',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        session,
        signIn,
        signUp,
        resetPassword,
        signOut,
        loading,
        isAdmin,
        userRole,
        checkUserRole,
        updateNickname,
        getNickname,
        updateProfileImage,
        getProfileImage,
        getUserRole,
        updateUserRole,
      }}
    >
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
