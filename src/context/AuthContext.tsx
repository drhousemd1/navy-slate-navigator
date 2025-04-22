
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/api/supabase';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null, data: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
  updatePassword: (password: string) => Promise<{ error: any | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Sign-in function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email, 
        password
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Check your email and password",
        variant: "destructive",
      });
      return { error };
    }
  };

  // Sign-up function
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Please check your email for verification",
      });
      
      return { error: null, data };
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Unable to create your account",
        variant: "destructive",
      });
      return { error, data: null };
    }
  };

  // Sign-out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for the reset link",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  // Update password function
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been successfully changed",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change event:', event);
        
        if (event === 'SIGNED_OUT') {
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
      }
    );

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user || null);
        setIsAuthenticated(!!session);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error getting session:", error);
        setLoading(false);
      });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const contextValue: AuthContextType = {
    user,
    session,
    isAuthenticated,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
