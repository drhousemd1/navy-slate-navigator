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
      // We need to make sure we use a root domain URL without any paths
      // as Supabase will handle appending the path itself
      let baseUrl;
      
      if (window.location.hostname === 'localhost') {
        // For localhost, use a direct URL without path
        baseUrl = window.location.origin; // This gives http://localhost:3000 or http://localhost:5173
        console.log('Using localhost base URL:', baseUrl);
      } else if (window.location.hostname.includes('lovable.app')) {
        // For preview environment
        baseUrl = 'https://id-preview--98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovable.app';
        console.log('Using preview base URL:', baseUrl);
      } else {
        // For production environment
        baseUrl = 'https://98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovableproject.com';
        console.log('Using production base URL:', baseUrl);
      }
      
      console.log('Sending password reset to:', email);
      console.log('With base URL:', baseUrl);
      
      // CRITICAL: Don't include any paths here, Supabase will automatically 
      // redirect to the correct URL after authentication
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: baseUrl,
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
