
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useAuthOperations() {
  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      console.log('Sign in successful:', data.user?.email);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Exception during sign in:', error);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
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
        toast({
          title: 'Registration failed',
          description: error.message,
          variant: 'destructive',
        });
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
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error, data: null };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      // For production environments, hardcode the production URL
      const productionUrl = "https://98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovableproject.com";
      const previewUrl = "https://id-preview--98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovable.app";
      
      // Determine the correct redirect URL based on the current environment
      const currentOrigin = window.location.origin;
      console.log('Current origin for password reset:', currentOrigin);
      
      let redirectUrl;
      if (currentOrigin.includes('localhost')) {
        // In local development, use the production URL to avoid CORS issues
        redirectUrl = `${productionUrl}/reset-password`;
        console.log('Using production URL for localhost reset:', redirectUrl);
      } else if (currentOrigin.includes('lovable.app')) {
        // In preview environment
        redirectUrl = `${previewUrl}/reset-password`;
        console.log('Using preview URL for reset:', redirectUrl);
      } else {
        // In production environment
        redirectUrl = `${productionUrl}/reset-password`;
        console.log('Using production URL for reset:', redirectUrl);
      }
      
      console.log('Sending password reset to:', email);
      console.log('With redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: 'Password reset failed',
          description: error.message,
          variant: 'destructive',
        });
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
      toast({
        title: 'Password reset failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  return {
    signIn,
    signUp,
    resetPassword
  };
}
