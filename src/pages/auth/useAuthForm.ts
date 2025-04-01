
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
      // Validate input first to prevent unnecessary API calls
      if (!formState.email || !formState.password) {
        updateFormState({
          loginError: "Email and password are required",
          loading: false
        });
        return;
      }
      
      // Trim inputs before sending
      const email = formState.email.trim();
      const password = formState.password.trim();
      
      console.log("Attempting to sign in with email:", email);
      console.log("Login attempt details:", {
        email,
        passwordLength: password.length
      });
      
      // Sign in with trimmed values
      const { error } = await signIn(email, password);
      
      // Handle errors with consistent format
      if (error) {
        console.error("Login error details:", error);
        
        // Provide specific error message based on error type
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
      } else {
        console.log("Login successful");
        // The useEffect watching isAuthenticated will handle navigation
        // Reset login error and loading state
        updateFormState({ 
          loginError: null,
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
      // Trim inputs before sending
      const email = formState.email.trim();
      const password = formState.password.trim();
      
      console.log("Attempting to sign up with email:", email);
      const { error } = await signUp(email, password);
      
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
