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

  // Get auth operations
  const authOperations = useAuthOperations();
  const { signIn: authSignIn, signUp, resetPassword, updatePassword } = authOperations;
  
  // Wrap signIn to match expected return type in AuthContextType
  const signIn = async (email: string, password: string) => {
    try {
      const result = await authSignIn(email, password);
      // Keep the error object format consistent for error handling in useAuthForm
      return { error: result.error };
    } catch (error) {
      console.error("Error in signIn wrapper:", error);
      return { error };
    }
  };
  
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
    console.log('Setting up auth state listener and checking for existing session');
    let mounted = true;
    
    // First set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email);
        
        if (!mounted) return;
        
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

    // Then check for existing session
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('Initial session check:', currentSession?.user?.email || 'No session');
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsAuthenticated(!!currentSession);
        
        if (currentSession?.user) {
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
