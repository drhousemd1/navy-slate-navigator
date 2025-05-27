
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger'; // Added logger import

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract access token from URL on component mount
  useEffect(() => {
    // Get access_token from URL hash or query params (Supabase might use either)
    const hash = location.hash.substring(1); // Remove the # symbol
    const params = new URLSearchParams(hash || location.search);
    
    // Check for access_token in hash fragment or query params
    const token = params.get('access_token');
    
    if (token) {
      logger.debug('Access token found in URL'); // Replaced console.log
      setAccessToken(token);
      
      // Set up the session with the access token
      const setSession = async () => {
        if (!params.get('refresh_token')) {
          // If there's no refresh token, exit early — Supabase won't set session without it
          setError('Reset link is invalid or expired. Please request a new one.');
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: params.get('refresh_token') || '',
        });
        
        if (error) {
          logger.error('Error setting session:', error); // Replaced console.error
          setError('Failed to validate your reset token. Please request a new password reset link.');
        }
      };
      
      setSession();
    } else {
      logger.error('No access token found in URL'); // Replaced console.error
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!accessToken) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      // Update the password using Supabase directly
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        logger.error('Error updating password:', updateError); // Replaced console.error
        setError(updateError.message || 'Failed to update password. Please try again.');
      } else {
        // Password reset successful
        toast({
          title: 'Password updated',
          description: 'Your password has been successfully reset. You can now log in with your new password.',
        });
        navigate('/auth', { replace: true });
      }
    } catch (err: any) {
      logger.error('Exception during password update:', err); // Replaced console.error
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-4">
      <div className="w-full max-w-md p-6 space-y-6 bg-dark-navy rounded-lg shadow-lg border border-light-navy">
        <h1 className="text-2xl font-bold text-center text-white">Reset Your Password</h1>
        
        {error && (
          <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-white text-sm">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="bg-navy border-light-navy text-white"
              placeholder="Enter your new password"
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
              placeholder="Confirm your new password"
              minLength={6}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center mt-4" 
            disabled={loading || !accessToken}
          >
            <Lock className="w-4 h-4 mr-2" />
            {loading ? 'Updating Password...' : 'Reset Password'}
          </Button>
        </form>
        
        <div className="text-center">
          <Button 
            variant="link" 
            className="text-blue-400 hover:text-blue-300" 
            onClick={() => navigate('/auth')}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

