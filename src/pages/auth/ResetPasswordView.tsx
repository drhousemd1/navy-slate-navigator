
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const ResetPasswordView: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  // Check for active session on component mount
  useEffect(() => {
    console.log('ResetPasswordView mounted, checking for active session...');
    
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log('Session check result:', data?.session ? 'Active session found' : 'No active session');
        
        if (data?.session) {
          setHasSession(true);
        } else {
          setError('No active session found. The reset link may have expired. Please request a new password reset link.');
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError('Failed to verify authentication session. Please try again.');
      }
    };
    
    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate passwords
      if (!newPassword) {
        throw new Error('Please enter a new password.');
      }
      
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      
      console.log('Attempting to update password...');
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        throw new Error(error.message);
      }
      
      console.log('Password updated successfully');
      
      // Show success message and redirect
      setSuccess(true);
      toast({
        title: 'Password reset successful',
        description: 'Your password has been reset. You will be redirected to login.',
      });
      
      // Sign out the user to clear the temporary session
      await supabase.auth.signOut();
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-4">
      <div className="w-full max-w-md p-6 space-y-6 bg-dark-navy rounded-lg shadow-lg border border-light-navy">
        <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
        
        {error && (
          <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="text-green-400 text-sm py-2 px-3 bg-green-900/30 border border-green-900 rounded">
            Password reset successful! You will be redirected to the login page shortly.
          </div>
        ) : hasSession ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-white text-sm">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-navy border-light-navy text-white"
                placeholder="********"
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white text-sm">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-navy border-light-navy text-white"
                placeholder="********"
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center" 
              disabled={loading}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-white mb-4">If you don't have a valid reset link, you can request a new one:</p>
            <Button
              onClick={() => navigate('/auth', { state: { view: 'forgot-password' } })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Request New Reset Link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
