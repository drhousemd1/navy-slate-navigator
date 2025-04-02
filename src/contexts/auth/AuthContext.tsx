
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { AuthContextType } from './types';
import { useAuthOperations } from './useAuthOperations';
import { useUserProfile } from './useUserProfile';
import { useRoleManagement } from './useRoleManagement';
import { toast } from '@/hooks/use-toast';

// Create context with undefined as initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State variables
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Get auth operations - IMPORTANT: we need to directly use the operations
  const { 
    signIn, 
    signUp, 
    resetPassword, 
    updatePassword 
  } = useAuthOperations();
  
  // Get role management
  const roleManagement = useRoleManagement(user);
  const { userRole, isAdmin, checkUserRole } = roleManagement;
  
  // Get user profile operations
  const userProfile = useUserProfile(user, setUser);
  const { 
    updateNickname, 
    getNickname, 
    updateProfileImage, 
    getProfileImage,
    getUserRole,
    updateUserRole
  } = userProfile;

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      
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

  // Set up auth state listener and check for existing session
  useEffect(() => {
    console.log('Checking session and setting up auth state listener');
    let mounted = true;

    const checkSessionAndSubscribe = async () => {
      try {
        // Check if current path is the reset password page
        // If it is, we don't want to redirect based on auth state
        const isResetPasswordPage = window.location.pathname === '/reset-password';
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        console.log('Initial session check:', currentSession?.user?.email || 'No session');

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsAuthenticated(!!currentSession);

        if (currentSession?.user && !isResetPasswordPage) {
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }

        setLoading(false);

        // Now attach the auth state listener AFTER the session check
        supabase.auth.onAuthStateChange((event, newSession) => {
          console.log('Auth state changed:', event, newSession?.user?.email);

          if (!mounted) return;

          // Check again if we're on the reset password page
          const isResetPasswordPage = window.location.pathname === '/reset-password';
          
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setIsAuthenticated(!!newSession);

          if (newSession?.user && !isResetPasswordPage) {
            setTimeout(() => {
              checkUserRole();
            }, 0);
          }

          setLoading(false);
        });
      } catch (error) {
        console.error("Error checking session:", error);
        if (mounted) setLoading(false);
      }
    };

    checkSessionAndSubscribe();

    return () => {
      mounted = false;
    };
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    session,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
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
