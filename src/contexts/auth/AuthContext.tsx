
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase, clearAuthState } from '@/integrations/supabase/client';
import { useAuthOperations } from './useAuthOperations';
import { useUserProfile } from './useUserProfile';

// Define the types for the context
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  getNickname: () => string | null;
  getProfileImage: () => string | null;
  getUserRole: () => string;
  checkUserRole: () => Promise<void>;
  updateNickname: (nickname: string) => void;
  updateProfileImage: (imageUrl: string) => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component that wraps the app and provides the auth context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  
  // Import auth operations
  const { signIn: authSignIn, signUp: authSignUp, resetPassword: authResetPassword, updatePassword: authUpdatePassword } = useAuthOperations();
  
  // Import user profile functions
  const { updateNickname: profileUpdateNickname, getNickname, updateProfileImage: profileUpdateProfileImage, getProfileImage, getUserRole } = useUserProfile(user, setUser);

  console.log("AuthContext initialized. Current state:", {
    userExists: !!user,
    sessionExists: !!session,
    isAuthenticated,
    isAdmin,
    loading
  });

  // Delegate actual authentication functions to useAuthOperations
  const signIn = async (email: string, password: string) => {
    console.log("AuthContext: signIn called with email:", email);
    const result = await authSignIn(email, password);
    
    if (!result.error && result.user && result.session) {
      console.log("AuthContext: signIn successful, updating context state");
      setUser(result.user);
      setSession(result.session);
      setIsAuthenticated(true);
    } else {
      console.error("AuthContext: signIn failed:", result.error);
    }
    
    return result;
  };

  const signUp = async (email: string, password: string) => {
    console.log("AuthContext: signUp called with email:", email);
    const result = await authSignUp(email, password);
    
    if (!result.error && result.data?.user && result.data?.session) {
      console.log("AuthContext: signUp successful, updating context state");
      setUser(result.data.user);
      setSession(result.data.session);
      setIsAuthenticated(true);
    } else {
      console.error("AuthContext: signUp failed:", result.error);
    }
    
    return result;
  };

  // Sign-out function
  const signOut = async () => {
    try {
      console.log("AuthContext: signOut called");
      
      // Clear auth state first
      await clearAuthState();
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign-out error:', error);
        throw error;
      }

      console.log("AuthContext: signOut successful, clearing context state");
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      
      // Force navigation to auth page
      navigate('/auth');
      
      // Force reload the page to clear any cached state
      window.location.reload();
    } catch (error: any) {
      console.error('Sign-out failed:', error);
      throw error;
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

  // Wrapper functions to expose the imported functions
  const resetPassword = (email: string) => authResetPassword(email);
  const updatePassword = (newPassword: string) => authUpdatePassword(newPassword);
  const updateNickname = (nickname: string) => profileUpdateNickname(nickname);
  const updateProfileImage = (imageUrl: string) => profileUpdateProfileImage(imageUrl);

  // Set up the auth state change listener
  useEffect(() => {
    console.log("AuthContext: Setting up auth state listener");
    
    // Set up the auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change event:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log("Auth state: User signed out");
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
          setLoading(false);
          
          // Force reload the page on sign out to clear any cached state
          navigate('/auth');
        } else if (newSession) {
          console.log("Auth state: User session detected");
          setUser(newSession.user);
          setSession(newSession);
          setIsAuthenticated(true);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Auth state: Token refreshed");
          if (newSession) {
            setUser(newSession.user);
            setSession(newSession);
            setIsAuthenticated(true);
          }
        } else if (event === 'USER_UPDATED') {
          console.log("Auth state: User updated");
          if (newSession) {
            setUser(newSession.user);
            setSession(newSession);
          }
        }
        
        // Specifically handle password recovery event
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected');
        }
      }
    );

    // Initial load of auth state
    console.log("AuthContext: Checking for existing session");
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          console.log("Found existing session:", session.user.email);
          setUser(session.user);
          setSession(session);
          setIsAuthenticated(true);
        } else {
          console.log("No existing session found");
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error getting session:", error);
        setLoading(false);
      });

    // Check user role when user changes
    if (isAuthenticated && user) {
      checkUserRole();
    }

    // Cleanup subscription on unmount
    return () => {
      console.log("AuthContext: Cleaning up auth subscription");
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
    resetPassword,
    updatePassword,
    getNickname,
    getProfileImage,
    getUserRole,
    checkUserRole,
    updateNickname,
    updateProfileImage,
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
