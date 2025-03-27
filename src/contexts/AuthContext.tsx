import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type UserRole = 'admin' | 'user';

type AuthContextType = {
  isAuthenticated: boolean;
  user: any | null;
  session: any | null;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null; data: any | null }>;
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
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

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
        setUserRole('user');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsAuthenticated(!!currentSession);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsAuthenticated(!!currentSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      checkUserRole();
    } else {
      setUserRole(null);
      setIsAdmin(false);
    }
  }, [isAuthenticated, user]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: 'Registration failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error, data: null };
      }
      
      toast({
        title: 'Registration successful',
        description: 'Please check your email to verify your account.',
      });
      
      return { error: null, data };
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error, data: null };
    }
  };

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
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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

  const getProfileImage = (): string => {
    if (!user) return '';
    return user.user_metadata?.avatar_url || '';
  };

  const getUserRole = (): string => {
    if (!user) return 'Submissive'; // Default role with proper capitalization
    
    // Get the role from metadata and ensure it's properly capitalized
    const role = user.user_metadata?.role || 'Submissive';
    
    // Ensure first letter is capitalized (in case it's stored lowercase in the database)
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const updateUserRole = async (role: string) => {
    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: { 
            role 
          }
        });
        
        if (error) {
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
