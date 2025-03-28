
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we have a valid access token in the URL
  useEffect(() => {
    const checkAccessToken = () => {
      // The URL will contain a hash fragment with the access token
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const token = hashParams.get('access_token');
      
      console.log('Access token from URL:', token ? '[PRESENT]' : '[NOT PRESENT]');
      console.log('URL hash:', location.hash);
      
      if (!token) {
        setError('Invalid or missing reset token. Please request a new password reset link.');
      } else {
        setAccessToken(token);
      }
    };
    
    checkAccessToken();
  }, [location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!newPassword) {
      setError('Please enter a new password.');
      setLoading(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }
    
    try {
      if (!accessToken) {
        throw new Error('Invalid or missing reset token.');
      }
      
      console.log('Attempting to update password...');
      
      // Update the user's password using the access token
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        throw error;
      }
      
      console.log('Password update successful');
      setSuccess(true);
      toast({
        title: 'Password reset successful',
        description: 'Your password has been reset. You will be redirected to login.',
      });
      
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
        
        {!accessToken && !error && (
          <div className="text-yellow-400 text-sm py-2 px-3 bg-yellow-900/30 border border-yellow-900 rounded">
            Looking for reset token in URL...
          </div>
        )}
        
        {success ? (
          <div className="text-green-400 text-sm py-2 px-3 bg-green-900/30 border border-green-900 rounded">
            Password reset successful! You will be redirected to the login page shortly.
          </div>
        ) : accessToken ? (
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
