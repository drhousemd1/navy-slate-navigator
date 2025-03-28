
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
      // Define the base URLs for different environments
      const productionDomain = "98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovableproject.com";
      const previewDomain = "id-preview--98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovable.app";
      
      // Explicitly use HTTPS for all URLs
      const productionUrl = `https://${productionDomain}/reset-password`;
      const previewUrl = `https://${previewDomain}/reset-password`;
      
      // Determine current environment
      const currentUrl = window.location.href;
      console.log('Current URL for password reset:', currentUrl);
      
      // Select the appropriate redirect URL based on environment
      let redirectTo;
      if (currentUrl.includes('localhost')) {
        // Use production URL for local development to avoid localhost issues
        redirectTo = productionUrl;
        console.log('Using production URL for localhost reset:', redirectTo);
      } else if (currentUrl.includes('lovable.app')) {
        // Use preview URL for preview environment
        redirectTo = previewUrl;
        console.log('Using preview URL for reset:', redirectTo);
      } else {
        // Use production URL for production environment
        redirectTo = productionUrl;
        console.log('Using production URL for reset:', redirectTo);
      }
      
      console.log('Sending password reset to:', email);
      console.log('With redirect URL:', redirectTo);
      
      // IMPORTANT: Make sure the redirectTo URL is an EXACT match to one of the URLs 
      // configured in the Supabase redirect_urls in config.toml
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
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
