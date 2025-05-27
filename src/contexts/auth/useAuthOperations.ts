
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger'; // Added logger import

export function useAuthOperations() {
  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      logger.log('Starting sign in process for email:', email); // Replaced console.log
      
      // Input validation - ensure values are properly trimmed
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        logger.error('Sign in validation error: Missing email or password'); // Replaced console.error
        return { error: { message: 'Email and password are required' }, user: null };
      }
      
      // Use the trimmed values for authentication
      logger.log('Making authentication request with:', { email: trimmedEmail }); // Replaced console.log
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (error) {
        logger.error('Sign in error:', error); // Replaced console.error
        
        // More specific error messages
        let errorMsg = error.message;
        if (error.message.includes("invalid login")) {
          errorMsg = "Incorrect email or password. Please try again.";
        }
        
        return { error: { ...error, message: errorMsg }, user: null };
      }
      
      logger.log('Sign in successful:', data.user?.email); // Replaced console.log
      logger.log('Session data:', data.session ? 'Session exists' : 'No session'); // Replaced console.log
      
      // Make sure we validate the session before confirming success
      if (!data.session) {
        logger.error('Sign in produced no session'); // Replaced console.error
        return { 
          error: { message: 'Authentication successful but no session was created. Please try again.' },
          user: data.user 
        };
      }
      
      return { error: null, user: data.user, session: data.session };
    } catch (error: any) {
      logger.error('Exception during sign in:', error); // Replaced console.error
      return { error, user: null };
    }
  };

  // Sign up with email and password - with improved error handling
  const signUp = async (email: string, password: string) => {
    try {
      // Trim inputs before sending
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        return { error: { message: 'Email and password are required' }, data: null };
      }
      
      // Check minimum password length
      if (trimmedPassword.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' }, data: null };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) {
        logger.error('Sign up error:', error); // Replaced console.error
        return { error, data: null };
      }
      
      logger.log('Sign up successful:', data.user?.email); // Replaced console.log
      toast({
        title: 'Registration successful',
        description: data.session ? 'You are now logged in.' : 'Please check your email to verify your account.',
      });
      
      return { error: null, data };
    } catch (error: any) {
      logger.error('Exception during sign up:', error); // Replaced console.error
      return { error, data: null };
    }
  };

  // Reset password with improved error messaging
  const resetPassword = async (email: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!trimmedEmail) {
        return { error: { message: 'Email is required' } };
      }
      
      logger.log('Sending password reset to:', trimmedEmail); // Replaced console.log
      
      // Get the current origin for the redirect
      const siteUrl = window.location.origin;
      logger.log('Using site URL for password reset:', siteUrl); // Replaced console.log
      
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      
      if (error) {
        logger.error('Password reset error:', error); // Replaced console.error
        return { error };
      }
      
      logger.log('Password reset email sent to:', trimmedEmail); // Replaced console.log
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for the password reset link.',
      });
      
      return { error: null };
    } catch (error: any) {
      logger.error('Exception during password reset:', error); // Replaced console.error
      return { error };
    }
  };

  // Update password with improved validation
  const updatePassword = async (newPassword: string) => {
    try {
      const trimmedPassword = newPassword.trim();
      
      if (!trimmedPassword) {
        return { error: { message: 'New password is required' } };
      }
      
      if (trimmedPassword.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' } };
      }
      
      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword
      });
      
      if (error) {
        logger.error('Password update error:', error); // Replaced console.error
        return { error };
      }
      
      logger.log('Password updated successfully'); // Replaced console.log
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      });
      
      return { error: null };
    } catch (error: any) {
      logger.error('Exception during password update:', error); // Replaced console.error
      return { error };
    }
  };

  // Delete user account
  const deleteAccount = async () => {
    try {
      // Use type assertion 'as any' to bypass TypeScript error due to potentially stale types
      const { error } = await supabase.rpc('delete_user_account' as any);
      
      if (error) {
        logger.error('Account deletion error:', error); // Replaced console.error
        toast({
          title: 'Error deleting account',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      logger.log('Account deletion initiated successfully'); // Replaced console.log
      toast({
        title: 'Account deletion initiated',
        description: 'Your account is scheduled for deletion. You will be logged out shortly.',
      });
      
      // User will be logged out automatically by auth listener when account is deleted
      return { error: null };
    } catch (error: any) {
      logger.error('Exception during account deletion:', error); // Replaced console.error
      return { error };
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

