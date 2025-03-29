
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
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is already authenticated, redirecting to home");
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const updateFormState = (updates: Partial<AuthFormState>) => {
    setFormState(prevState => ({ ...prevState, ...updates }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateFormState({ loading: true, loginError: null });

    try {
      console.log("Attempting to sign in with email:", formState.email);
      
      // Validate input
      if (!formState.email.trim() || !formState.password.trim()) {
        updateFormState({
          loginError: "Email and password are required",
          loading: false
        });
        return;
      }
      
      // Log auth attempt for debugging
      console.log("Login attempt details:", {
        email: formState.email.trim(),
        passwordLength: formState.password?.trim().length || 0
      });
      
      const { error, user } = await signIn(formState.email.trim(), formState.password.trim());
      
      if (error) {
        console.error("Login error details:", error);
        
        // Provide more specific error messages based on error type
        let errorMessage = "Invalid login credentials. Please check your email and password.";
        if (error.message) {
          if (error.message.includes("Invalid login")) {
            errorMessage = "The email or password you entered is incorrect. Please try again.";
          } else {
            errorMessage = error.message;
          }
        }
        
        updateFormState({
          loginError: errorMessage,
          loading: false
        });
      } else if (user) {
        console.log("Login successful, navigating to home");
        navigate('/');
      } else {
        updateFormState({
          loginError: "An unexpected error occurred. Please try again.",
          loading: false
        });
      }
    } catch (error: any) {
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
        updateFormState({ loading: false });
        return "login";
      }
    } catch (error: any) {
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
