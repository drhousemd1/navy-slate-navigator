import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import { getSupabaseClient } from '@/integrations/supabase/client';

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash || location.search);
    
    const token = params.get('access_token');
    
    if (token) {
      console.log('Access token found in URL');
      setAccessToken(token);
      
      const setSession = async () => {
        if (!params.get('refresh_token')) {
          setError('Reset link is invalid or expired. Please request a new one.');
          return;
        }

        const { error } = await getSupabaseClient().auth.setSession({
          access_token: token,
          refresh_token: params.get('refresh_token') || '',
        });
        
        if (error) {
          console.error('Error setting session:', error);
          setError('Failed to validate your reset token. Please request a new password reset link.');
        }
      };
      
      setSession();
    } else {
      console.error('No access token found in URL');
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const { error: updateError } = await getSupabaseClient().auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        setError(updateError.message || 'Failed to update password. Please try again.');
      } else {
        toast({
          title: 'Password updated',
          description: 'Your password has been successfully reset. You can now log in with your new password.',
        });
        navigate('/auth', { replace: true });
      }
    } catch (err: any) {
      console.error('Exception during password update:', err);
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
