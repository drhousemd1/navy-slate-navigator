
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthOperations, useRoleManagement, useUserProfile } from './auth';
import { AuthContextType, AuthProviderState } from './auth/types';
import { logger } from '@/lib/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthProviderState = {
  userExists: false,
  sessionExists: false,
  isAuthenticated: false,
  isAdmin: false, // Default to false
  loading: true, // Start in loading state
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthProviderState>(initialState);

  const { userRole, isAdmin: roleIsAdmin, checkUserRole } = useRoleManagement(user);
  const userProfileHooks = useUserProfile(user, setUser);
  const authOperationHooks = useAuthOperations(setUser, setSession, setAuthState);

  useEffect(() => {
    logger.log('AuthContext: Initializing, setting up listeners...');
    const checkInitialSession = async () => {
      logger.log('AuthContext: Checking initial session...');
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) {
        logger.error('AuthContext: Error getting initial session:', error);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      if (currentSession) {
        setUser(currentSession.user);
        setSession(currentSession);
        setAuthState(prev => ({
          ...prev,
          userExists: !!currentSession.user,
          sessionExists: true,
          isAuthenticated: true,
          loading: false, // Initial check done
        }));
        logger.log('AuthContext: Initial session found:', currentSession);
      } else {
        setUser(null);
        setSession(null);
        setAuthState(prev => ({
          ...prev,
          userExists: false,
          sessionExists: false,
          isAuthenticated: false,
          isAdmin: false,
          loading: false, // Initial check done
        }));
        logger.log('AuthContext: No initial session found.');
      }
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      logger.log('AuthContext: Auth state change event:', _event, 'New Session State:', newSession);
      setSession(newSession);
      setUser(newSession?.user ?? null);

      setAuthState(prev => ({
        ...prev,
        userExists: !!newSession?.user,
        sessionExists: !!newSession,
        isAuthenticated: !!newSession?.user,
        loading: false, // Auth state known
        // Preserve isAdmin if user still exists, otherwise reset
        isAdmin: newSession?.user ? prev.isAdmin : false
      }));
      logger.log('AuthContext: State updated after auth event. New state (isAdmin preserved if user exists):', {
        userExists: !!newSession?.user,
        sessionExists: !!newSession,
        isAuthenticated: !!newSession?.user,
        isAdmin: newSession?.user ? authState.isAdmin : false, // use potentially stale authState here as prev might not be updated
        loading: false,
      });

      if (newSession?.user) {
        logger.log(`AuthContext: Auth state change - User found, async checking admin role for ${newSession.user.id}`);
        // Role check will update isAdmin via its own state effects
      } else {
        logger.log('AuthContext: Auth state change - No user, isAdmin set to false.');
        setAuthState(prev => ({ ...prev, isAdmin: false }));
      }
    });

    return () => {
      logger.log('AuthContext: Cleaning up auth subscription.');
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ensure authState.isAdmin is not in deps to avoid loop, roleIsAdmin handles it

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user, checkUserRole]);

  useEffect(() => {
    // Update context's isAdmin based on the role management hook
    setAuthState(prev => ({ ...prev, isAdmin: roleIsAdmin }));
  }, [roleIsAdmin]);

  const contextValue: AuthContextType = {
    ...authState,
    user,
    session,
    userRole, // from useRoleManagement
    setUser,
    setSession,
    ...authOperationHooks, // signIn, signOut, signUp, deleteAccount
    ...userProfileHooks, // updateNickname, getNickname, etc.
  };
  
  if (authState.loading) {
    // Potentially render a global loading spinner or a minimal layout
    // For now, returning null or a simple div might be fine if AppLayout handles its own loading state
    return <div className="flex items-center justify-center h-screen"><p>Loading authentication...</p></div>;
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
