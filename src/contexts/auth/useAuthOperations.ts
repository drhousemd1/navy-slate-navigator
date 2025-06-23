import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { isSupabaseAuthError, createAppError, getErrorMessage, SupabaseAuthError, AppError, CaughtError, PostgrestError, isPostgrestError, isAppError } from '@/lib/errors';
import type { User, Session, AuthResponse } from '@supabase/supabase-js';

export function useAuthOperations() {
  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<{ error?: SupabaseAuthError | AppError | null, user?: User | null, session?: Session | null }> => {
    try {
      logger.debug('Starting sign in process for email:', email);
      
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        logger.error('Sign in validation error: Missing email or password');
        return { error: createAppError('Email and password are required', 'VALIDATION_ERROR'), user: null, session: null };
      }
      
      logger.debug('Making authentication request with:', { email: trimmedEmail });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (error) {
        logger.error('Sign in error:', error);
        // If the error message indicates invalid login, return a custom AppError with a friendlier message.
        if (error.message.includes("invalid login") || error.message.includes("Invalid login credentials")) {
          return { error: createAppError("Incorrect email or password. Please try again.", "AUTH_INVALID_CREDENTIALS"), user: null, session: null };
        }
        // Otherwise, return the original Supabase error.
        return { error, user: null, session: null };
      }
      
      logger.debug('Sign in successful:', data.user?.email);
      logger.debug('Session data:', data.session ? 'Session exists' : 'No session');
      
      if (!data.session) {
        logger.error('Sign in produced no session');
        return { 
          error: createAppError('Authentication successful but no session was created. Please try again.', 'AUTH_NO_SESSION'),
          user: data.user,
          session: null
        };
      }
      
      return { error: null, user: data.user, session: data.session };
    } catch (error: unknown) {
      logger.error('Exception during sign in:', error);
      if (isSupabaseAuthError(error)) {
        return { error, user: null, session: null };
      }
      // Check if it's an AppError before creating a new one
      if (isAppError(error)) {
        return { error, user: null, session: null };
      }
      return { error: createAppError(getErrorMessage(error), 'SIGN_IN_EXCEPTION'), user: null, session: null };
    }
  };

  // Sign up with email and password - with improved error handling and role support
  const signUp = async (email: string, password: string, role?: 'dominant' | 'submissive'): Promise<{ error?: SupabaseAuthError | AppError | null, data?: AuthResponse['data'] | null }> => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        return { error: createAppError('Email and password are required', 'VALIDATION_ERROR'), data: null };
      }
      
      if (trimmedPassword.length < 6) {
        return { error: createAppError('Password must be at least 6 characters long', 'VALIDATION_ERROR'), data: null };
      }
      
      // Prepare user metadata with role
      const userMetadata: Record<string, any> = {};
      if (role) {
        userMetadata.role = role;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: userMetadata // Store role in user metadata
        }
      });
      
      if (error) {
        logger.error('Sign up error:', error);
        return { error, data: null };
      }
      
      logger.debug('Sign up successful:', data.user?.email, 'with role:', role);
      toast({
        title: 'Registration successful',
        description: data.session ? 'You are now logged in.' : 'Please check your email to verify your account.',
      });
      
      return { error: null, data: data };
    } catch (error: unknown) {
      logger.error('Exception during sign up:', error);
      if (isSupabaseAuthError(error)) {
        return { error, data: null };
      }
      if (isAppError(error)) {
        return { error, data: null };
      }
      return { error: createAppError(getErrorMessage(error), 'SIGN_UP_EXCEPTION'), data: null };
    }
  };

  // Reset password with improved error messaging
  const resetPassword = async (email: string): Promise<{ error?: SupabaseAuthError | AppError | null }> => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!trimmedEmail) {
        return { error: createAppError('Email is required', 'VALIDATION_ERROR') };
      }
      
      logger.debug('Sending password reset to:', trimmedEmail);
      const siteUrl = window.location.origin;
      logger.debug('Using site URL for password reset:', siteUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      
      if (error) {
        logger.error('Password reset error:', error);
        return { error };
      }
      
      logger.debug('Password reset email sent to:', trimmedEmail);
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for the password reset link.',
      });
      
      return { error: null };
    } catch (error: unknown) {
      logger.error('Exception during password reset:', error);
      if (isSupabaseAuthError(error)) {
        return { error };
      }
      if (isAppError(error)) {
        return { error };
      }
      return { error: createAppError(getErrorMessage(error), 'RESET_PASSWORD_EXCEPTION') };
    }
  };

  // Update password with improved validation
  const updatePassword = async (newPassword: string): Promise<{ error?: SupabaseAuthError | AppError | null }> => {
    try {
      const trimmedPassword = newPassword.trim();
      
      if (!trimmedPassword) {
        return { error: createAppError('New password is required', 'VALIDATION_ERROR') };
      }
      
      if (trimmedPassword.length < 6) {
        return { error: createAppError('Password must be at least 6 characters long', 'VALIDATION_ERROR') };
      }
      
      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword
      });
      
      if (error) {
        logger.error('Password update error:', error);
        return { error };
      }
      
      logger.debug('Password updated successfully');
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      });
      
      return { error: null };
    } catch (error: unknown) {
      logger.error('Exception during password update:', error);
      if (isSupabaseAuthError(error)) {
        return { error };
      }
      if (isAppError(error)) {
        return { error };
      }
      return { error: createAppError(getErrorMessage(error), 'UPDATE_PASSWORD_EXCEPTION') };
    }
  };

  // Delete user account
  const deleteAccount = async (): Promise<{ error?: CaughtError | null }> => {
    try {
      // The RPC call might return a PostgrestError which is compatible with CaughtError
      const { error: rpcError } = await supabase.rpc('delete_user_account'); // Removed 'as any'
      
      if (rpcError) {
        logger.error('Account deletion error from RPC:', rpcError);
        // rpcError is PostgrestError | null. If not null, its properties are directly accessible.
        const descriptiveError = createAppError(
          rpcError.message || 'Could not delete account via RPC.',
          rpcError.code || 'RPC_ERROR', // Use rpcError.code
          { details: rpcError.details, hint: rpcError.hint } // Use rpcError.details and rpcError.hint
        );
        toast({
          title: 'Error deleting account',
          description: descriptiveError.message,
          variant: 'destructive',
        });
        
        // isPostgrestError check is redundant here as rpcError is already known to be PostgrestError if not null.
        return { error: rpcError }; 
      }

      logger.debug('Account deletion initiated successfully');
      toast({
        title: 'Account deletion initiated',
        description: 'Your account is scheduled for deletion. You will be logged out shortly.',
      });
      
      return { error: null };
    } catch (error: unknown) {
      logger.error('Exception during account deletion:', error);
      // Ensure the error thrown or returned conforms to CaughtError
      if (isSupabaseAuthError(error) || isPostgrestError(error) || isAppError(error) || error instanceof Error) {
        return { error: error as CaughtError };
      }
      return { error: createAppError(getErrorMessage(error), 'DELETE_ACCOUNT_EXCEPTION') };
    }
  };

  return {
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    deleteAccount
  };
}
