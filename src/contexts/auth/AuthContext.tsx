
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
      // First clear any state
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      
      // Then sign out from Supabase
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
        // Clear auth state
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
          
          // Use setTimeout to avoid potential auth deadlocks
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
    
    // Initialize auth state
    initializeAuth();
    
    // Clean up the subscription when component unmounts
    return () => {
      console.log('Cleaning up auth state listener');
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
