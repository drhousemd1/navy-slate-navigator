import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useAuthOperations() {
  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email:', email);
      
      // Input validation - ensure values are properly trimmed
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        console.error('Sign in validation error: Missing email or password');
        return { error: { message: 'Email and password are required' }, user: null };
      }
      
      // Log auth request details but not the actual password
      console.log('Auth request details:', { email: trimmedEmail, passwordLength: trimmedPassword.length });
      
      // Use the trimmed values for authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (error) {
        console.error('Sign in error details:', error);
        return { error, user: null };
      }
      
      console.log('Sign in successful:', data.user?.email);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      return { error: null, user: data.user };
    } catch (error: any) {
      console.error('Exception during sign in:', error);
      return { error, user: null };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error, data: null };
      }
      
      console.log('Sign up successful:', data.user?.email);
      toast({
        title: 'Registration successful',
        description: 'Please check your email to verify your account.',
      });
      
      return { error: null, data };
    } catch (error: any) {
      console.error('Exception during sign up:', error);
      return { error, data: null };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset to:', email);
      
      // Get the current hostname to determine environment
      const isLocalhost = window.location.hostname === 'localhost';
      
      // Use the appropriate site URL based on environment
      const siteUrl = isLocalhost 
        ? 'http://localhost:3000' 
        : window.location.origin;
      
      console.log('Using site URL for password reset:', siteUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error);
        return { error };
      }
      
      console.log('Password reset email sent to:', email);
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for the password reset link.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during password reset:', error);
      return { error };
    }
  };

  // Update password (for reset password flow)
  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        return { error };
      }
      
      console.log('Password updated successfully');
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during password update:', error);
      return { error };
    }
  };

  return {
    signIn,
    signUp,
    resetPassword,
    updatePassword
  };
}
