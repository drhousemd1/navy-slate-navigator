
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

  // Fix the auth state handling to avoid session persistence issues
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.email);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed:', newSession?.user?.email);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsAuthenticated(!!newSession);
        
        // Defer role checking to avoid auth deadlocks
        if (newSession?.user) {
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    });
    
    // Check for an existing session
    const checkExistingSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('Initial session check:', currentSession?.user?.email || 'No session');
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsAuthenticated(!!currentSession);
        
        if (currentSession?.user) {
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkExistingSession();
    
    // Clean up subscription when component unmounts
    return () => {
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
