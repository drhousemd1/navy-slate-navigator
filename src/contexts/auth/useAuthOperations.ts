
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthProviderState } from './types';
import { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export function useAuthOperations(
  setUser: (user: any) => void,
  setSession: (session: any) => void,
  setAuthState: React.Dispatch<React.SetStateAction<AuthProviderState>>
) {
  const signIn = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        logger.error('Sign-in error:', error.message);
        toast({ title: 'Sign-in Failed', description: error.message, variant: 'destructive' });
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        setAuthState(prev => ({
          ...prev,
          userExists: !!data.user,
          sessionExists: !!data.session,
          isAuthenticated: true,
          loading: false,
          error: null,
        }));
        toast({ title: 'Signed In', description: 'Welcome back!' });
        return { success: true };
      }
      // Handle case where no session/user but no error (should be rare)
      setAuthState(prev => ({ ...prev, loading: false, error: 'Sign-in did not return a session.' }));
      return { success: false, error: 'Sign-in did not return a session.' };
    } catch (e: any) {
      logger.error('Unexpected sign-in error:', e.message);
      toast({ title: 'Sign-in Error', description: e.message || 'An unexpected error occurred.', variant: 'destructive' });
      setAuthState(prev => ({ ...prev, loading: false, error: e.message || 'An unexpected error occurred.' }));
      return { success: false, error: e.message || 'An unexpected error occurred.' };
    }
  }, [setUser, setSession, setAuthState]);

  const signOut = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign-out error:', error);
      toast({ title: 'Sign-out Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Signed Out', description: 'You have been signed out.' });
    }
    setUser(null);
    setSession(null);
    setAuthState({
      userExists: false,
      sessionExists: false,
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
      error: error ? error.message : null,
    });
  }, [setUser, setSession, setAuthState]);

  const signUp = useCallback(async (credentials: SignUpWithPasswordCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) {
        logger.error('Sign-up error:', error.message);
        toast({ title: 'Sign-up Failed', description: error.message, variant: 'destructive' });
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message, user: null };
      }
      // Note: Supabase signUp might return a user & session if email confirmation is disabled,
      // or just a user if email confirmation is required.
      if (data.user) {
        // If email verification is off, data.session might exist.
        if (data.session) {
            setSession(data.session);
            setUser(data.user);
            setAuthState(prev => ({
                ...prev,
                userExists: true,
                sessionExists: true,
                isAuthenticated: true,
                loading: false,
                error: null,
            }));
            toast({ title: 'Sign-up Successful!', description: 'Welcome! You are now signed in.' });
        } else {
            // Email verification likely required
            setUser(data.user); // User object exists, but not yet authenticated session
            setAuthState(prev => ({
                ...prev,
                userExists: true, // User record created
                sessionExists: false,
                isAuthenticated: false,
                loading: false,
                error: null,
            }));
            toast({ title: 'Sign-up Almost Complete!', description: 'Please check your email to verify your account.' });
        }
        return { success: true, user: data.user };
      }
      // Fallback if no user object is returned, though this implies an error usually.
      setAuthState(prev => ({ ...prev, loading: false, error: 'Sign-up did not return user information.' }));
      return { success: false, error: 'Sign-up did not return user information.', user: null };
    } catch (e: any) {
      logger.error('Unexpected sign-up error:', e.message);
      toast({ title: 'Sign-up Error', description: e.message || 'An unexpected error occurred.', variant: 'destructive' });
      setAuthState(prev => ({ ...prev, loading: false, error: e.message || 'An unexpected error occurred.' }));
      return { success: false, error: e.message || 'An unexpected error occurred.', user: null };
    }
  }, [setUser, setSession, setAuthState]);

  const deleteAccount = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    // First, call the Supabase Edge Function to delete user data
    const { error: functionError } = await supabase.functions.invoke('delete-user-account');

    if (functionError) {
      logger.error('Error calling delete-user-account function:', functionError);
      toast({
        title: 'Account Deletion Failed',
        description: `Could not delete associated data: ${functionError.message}. Please contact support.`,
        variant: 'destructive',
      });
      setAuthState(prev => ({ ...prev, loading: false, error: functionError.message }));
      return { success: false, error: functionError.message };
    }

    // If function call is successful, then proceed to sign out and clear local state
    // The actual deletion from auth.users is handled by the Edge Function for security.
    // Here we just sign out and clear client state.
    await signOut(); // signOut handles its own toasts and state updates for session/user
    
    toast({ title: 'Account Deletion Processed', description: 'Your account data has been processed for deletion.' });
    // State is already cleared by signOut
    return { success: true };

  }, [setAuthState, signOut]);


  return {
    signIn,
    signOut,
    signUp,
    deleteAccount,
  };
}
