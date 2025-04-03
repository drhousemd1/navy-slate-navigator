import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define the types for the context
interface AuthContextType {
  user: any | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getNickname: () => string | null;
	getProfileImage: () => string | null;
  getUserRole: () => string;
  checkUserRole: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component that wraps the app and provides the auth context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Sign-in function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign-in error:', error);
        throw error;
      }

      setUser(data.user);
      setSession(data.session);
      setIsAuthenticated(true);
      return { user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Sign-in failed:', error);
      throw error;
    }
  };

  // Sign-up function
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Sign-up error:', error);
        throw error;
      }

      setUser(data.user);
      setSession(data.session);
      setIsAuthenticated(true);
      return { user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Sign-up failed:', error);
      throw error;
    }
  };

  // Sign-out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign-out error:', error);
        throw error;
      }

      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      navigate('/auth');
    } catch (error: any) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };
  
  // Function to get the nickname from user metadata
  const getNickname = () => {
    return user?.user_metadata?.nickname || null;
  };
  
	// Function to get the profile image from user metadata
	const getProfileImage = () => {
		return user?.user_metadata?.avatar_url || null;
	};

  // Function to get the user role from user metadata
  const getUserRole = () => {
    const role = user?.user_metadata?.role;
    if (role === 'admin') {
      return 'Administrator';
    } else if (role === 'user') {
      return 'User';
    } else {
      return 'Unknown Role';
    }
  };

  // Function to check user role
  const checkUserRole = async () => {
    try {
      if (user) {
        // Fetch the latest user data to ensure metadata is up-to-date
        const { data: updatedUser, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("Error fetching updated user data:", userError);
          return;
        }
        
        const role = updatedUser.user?.user_metadata?.role;
        setIsAdmin(role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setIsAdmin(false);
    }
  };

  // Set up the auth state change listener
  useEffect(() => {
    // Set up the auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change event:', event);
        
        // Fix the comparison to include proper event types
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
          setLoading(false);
        } else if (newSession) {
          setUser(newSession.user);
          setSession(newSession);
          setIsAuthenticated(true);
          setLoading(false);
        }
        
        // Specifically handle password recovery event
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected');
        }
      }
    );

    // Initial load of auth state
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          setUser(session.user);
          setSession(session);
          setIsAuthenticated(true);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error getting session:", error);
        setLoading(false);
      });

    // Check user role on initial load and when user changes
    if (isAuthenticated && user) {
      checkUserRole();
    }

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  // Provide the auth context value
  const value: AuthContextType = {
    user,
    session,
    isAuthenticated,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
    getNickname,
		getProfileImage,
    getUserRole,
    checkUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
