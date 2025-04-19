
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext'; 
import { toast } from '@/hooks/use-toast';
import { AuthFormState } from './types';

export function useAuthForm() {
  const [formState, setFormState] = useState<AuthFormState>({
    email: '', 
    password: '', 
    loading: false,
    loginError: null
  });

  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const updateFormState = (updates: Partial<AuthFormState>) => {
    setFormState(prevState => ({ ...prevState, ...updates }));
  };

  const handleLoginSubmit = async (e: React.FormEvent, rememberMe: boolean) => {
    e.preventDefault();
    updateFormState({ loading: true, loginError: null });

    if (!formState.email || !formState.password) {
      updateFormState({
        loginError: "Email and password are required",
        loading: false
      });
      return;
    }

    try {
      const { error } = await signIn(formState.email, formState.password, rememberMe);

      if (error) {
        updateFormState({
          loginError: error.message || "Authentication failed. Please check your credentials.",
          loading: false
        });
      } else {
        toast({
          title: "Login successful",
          description: "You have been successfully logged in.",
        });
        updateFormState({ loginError: null, loading: false });
      }
    } catch (error: any) {
      updateFormState({
        loginError: "An unexpected error occurred. Please try again.",
        loading: false
      });
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent): Promise<"login" | null> => {
    e.preventDefault();
    updateFormState({ loading: true, loginError: null });

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

    try {
      const { error } = await signUp(formState.email, formState.password);

      if (error) {
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
        updateFormState({ loading: false });
        return "login";
      }
    } catch (error: any) {
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
