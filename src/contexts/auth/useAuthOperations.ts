
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useAuthOperations() {
  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email:', email);
      
      // Input validation - ensure values are properly trimmed
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        console.error('Sign in validation error: Missing email or password');
        return { error: { message: 'Email and password are required' }, user: null };
      }
      
      // Log auth request details but not the actual password
      console.log('Auth request details:', { email: trimmedEmail, passwordLength: trimmedPassword.length });
      
      // Clear any existing sessions - fixes common authentication issues
      await supabase.auth.signOut();
      
      // Use the trimmed values for authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (error) {
        console.error('Sign in error (full response):', { error, data });
        
        // More specific error messages
        let errorMsg = error.message;
        if (error.message.includes("invalid login")) {
          errorMsg = "Incorrect email or password. Please try again.";
        }
        
        return { error: { ...error, message: errorMsg }, user: null };
      }
      
      console.log('Sign in successful:', data.user?.email);
      
      // Only toast success if we have user data
      if (data.user) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
      }
      
      return { error: null, user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Exception during sign in:', error);
      return { error, user: null };
    }
  };

  // Sign up with email and password
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
      
      // Clear any existing session first
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
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
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!trimmedEmail) {
        return { error: { message: 'Email is required' } };
      }
      
      console.log('Sending password reset to:', trimmedEmail);
      
      // Get the current origin instead of hardcoding localhost
      const siteUrl = window.location.origin;
      
      console.log('Using site URL for password reset:', siteUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error);
        return { error };
      }
      
      console.log('Password reset email sent to:', trimmedEmail);
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
