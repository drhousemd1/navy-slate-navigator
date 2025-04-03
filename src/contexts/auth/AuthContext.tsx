
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, clearAuthState } from '@/integrations/supabase/client';
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
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

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

  // Sign out function with improved error handling
  const signOut = useCallback(async () => {
    try {
      console.log('Signing out user...');
      setLoading(true);
      
      // First clear local state
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      
      // Then sign out from Supabase with global scope to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
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
      
      // Try force clearing auth state in case of error
      await clearAuthState();
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Handle session recovery error
  const handleSessionRecoveryFailure = useCallback(async () => {
    console.warn("Session recovery failed, clearing auth state and starting fresh");
    await clearAuthState();
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    setLoading(false);
  }, []);

  // Setup authentication state listener - significantly improved
  useEffect(() => {
    if (authInitialized) return;
    console.log('Setting up auth state listener');
    setLoading(true);
    
    // First, get current session without relying on event listeners
    const getCurrentSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          handleSessionRecoveryFailure();
          return;
        }
        
        const currentSession = data?.session;
        console.log('Initial session check:', currentSession?.user?.email || 'No session');
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);
          
          // Defer role check to prevent auth state deadlocks
          setTimeout(() => {
            checkUserRole();
          }, 0);
        } else {
          // No session found, ensure auth state is clean
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        handleSessionRecoveryFailure();
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log(`Auth state change: ${event}`, newSession?.user?.email);
      
      // Use consistent pattern for all events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log(`Auth event: ${event}`, newSession?.user?.email);
        setSession(newSession);
        setUser(newSession?.user || null);
        setIsAuthenticated(!!newSession);
        
        if (newSession?.user) {
          // Defer role check to prevent auth state deadlocks
          setTimeout(() => {
            checkUserRole();
          }, 0);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Clear auth state
        console.log(`Auth event: ${event}`);
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setLoading(false);
      setAuthInitialized(true);
    });
    
    // Initialize auth state
    getCurrentSession();
    
    // Clean up the subscription when component unmounts
    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [authInitialized, checkUserRole, handleSessionRecoveryFailure]);

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
