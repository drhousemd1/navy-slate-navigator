
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuthFormState } from './types';

export function useAuthForm() {
  const [formState, setFormState] = useState<AuthFormState>({
    email: '',
    password: '',
    loading: false,
    loginError: null
  });
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Check if a session already exists on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        console.log("Existing session found:", data.session.user.email);
        navigate('/');
      } else if (error) {
        console.error("Error checking session:", error);
      }
    };
    
    checkSession();
  }, [navigate]);

  const updateFormState = (updates: Partial<AuthFormState>) => {
    setFormState(prevState => ({ ...prevState, ...updates }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateFormState({ loading: true, loginError: null });

    try {
      console.log("Attempting to sign in with email:", formState.email);
      
      // Try direct Supabase auth to debug what's happening
      try {
        const { data: directAuthData, error: directAuthError } = await supabase.auth.signInWithPassword({
          email: formState.email,
          password: formState.password
        });
        
        if (directAuthError) {
          console.error("Direct Supabase auth error:", directAuthError);
          updateFormState({ loginError: `Authentication failed: ${directAuthError.message}`, loading: false });
          return;
        }
        
        if (directAuthData.user) {
          console.log("Login successful via direct Supabase auth:", directAuthData.user.email);
          navigate('/');
          return;
        }
      } catch (directError) {
        console.error("Exception during direct Supabase auth:", directError);
      }
      
      // Fallback to using context auth
      const { error } = await signIn(formState.email, formState.password);
      if (error) {
        console.error("Login error from context:", error);
        updateFormState({
          loginError: error.message || "Invalid login credentials. Please check your email and password.",
          loading: false
        });
      } else {
        console.log("Login successful via context, navigating to home");
        navigate('/');
      }
    } catch (error) {
      console.error("Authentication error:", error);
      updateFormState({
        loginError: "An unexpected error occurred. Please try again.",
        loading: false
      });
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateFormState({ loading: true, loginError: null });

    try {
      console.log("Attempting to sign up with email:", formState.email);
      const { error } = await signUp(formState.email, formState.password);
      if (error) {
        console.error("Signup error:", error);
        updateFormState({
          loginError: error.message || "Error creating account. This email may already be in use.",
          loading: false
        });
      } else {
        toast({
          title: "Account created",
          description: "Please check your email for verification instructions.",
        });
        // Return to login view after successful signup
        return "login";
      }
    } catch (error) {
      console.error("Authentication error:", error);
      updateFormState({
        loginError: "An unexpected error occurred. Please try again.",
        loading: false
      });
    } finally {
      updateFormState({ loading: false });
    }
    return null;
  };

  return {
    formState,
    updateFormState,
    handleLoginSubmit,
    handleSignupSubmit
  };
}
