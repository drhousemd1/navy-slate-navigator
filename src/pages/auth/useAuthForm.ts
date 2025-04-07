
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext'; 
import { toast } from '@/hooks/use-toast';
import { AuthFormState } from './types';
import { clearAuthState } from '@/integrations/supabase/client';

export function useAuthForm() {
  const [formState, setFormState] = useState<AuthFormState>({
    email: '', 
    password: '', 
    loading: false,
    loginError: null
  });
  
  // We'll wrap the Router-dependent code in a try-catch to prevent errors
  // when the component is rendered outside of a Router context (like in tests)
  let navigate;
  let location;
  
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch (error) {
    console.error("Router context not available:", error);
    // Provide fallback functions that do nothing
    navigate = () => {};
    location = { pathname: '/' };
  }
  
  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();

  // Log auth state changes for debugging
  useEffect(() => {
    console.log('Auth state in useAuthForm:', { 
      isAuthenticated, 
      authLoading
    });
  }, [isAuthenticated, authLoading]);

  // Only redirect if we're confident about auth state
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log("User is authenticated, redirecting to home");
      try {
        navigate('/');
      } catch (error) {
        console.error("Navigation failed:", error);
      }
    }
  }, [isAuthenticated, authLoading, navigate]);

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
      
      console.log("Login attempt with email:", formState.email);
      
      // Sign in with email and password directly
      const { error } = await signIn(formState.email, formState.password);
      
      // Handle errors with consistent format
      if (error) {
        console.error("Login error:", error);
        
        // Clear auth state only after failed login attempts
        await clearAuthState();
        
        updateFormState({
          loginError: error.message || "Authentication failed. Please check your credentials.",
          loading: false
        });
      } else {
        // Success case - toast notification
        toast({
          title: "Login successful",
          description: "You have been successfully logged in.",
        });
        
        // Reset login error and loading state
        updateFormState({ 
          loginError: null,
          loading: false 
        });
        
        // The useEffect watching isAuthenticated will handle navigation
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      
      // Clear auth state on error
      await clearAuthState();
      
      updateFormState({
        loginError: "An unexpected error occurred. Please try again.",
        loading: false
      });
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent): Promise<"login" | null> => {
    e.preventDefault();
    updateFormState({ loading: true, loginError: null });

    try {
      // Validate input
      if (!formState.email || !formState.password) {
        updateFormState({
          loginError: "Email and password are required",
          loading: false
        });
        return null;
      }
      
      if (formState.password.length < 6) {
        updateFormState({
          loginError: "Password must be at least 6 characters long",
          loading: false
        });
        return null;
      }
      
      console.log("Attempting to sign up with email:", formState.email);
      const { error } = await signUp(formState.email, formState.password);
      
      if (error) {
        console.error("Signup error:", error);
        updateFormState({
          loginError: error.message || "Error creating account. This email may already be in use.",
          loading: false
        });
        return null;
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
