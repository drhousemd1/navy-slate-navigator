import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const establishSession = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);

        const errorDescription =
          hashParams.get('error_description') || queryParams.get('error_description');
        if (errorDescription) {
          throw new Error(errorDescription);
        }

        // 1) Implicit flow: #access_token=...&refresh_token=...
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          // 2) PKCE flow: ?code=...
          const code = queryParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          } else {
            // 3) Token hash flow: ?token_hash=...&type=recovery
            const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
            const token = queryParams.get('token');
            if (tokenHash || token) {
              const { error } = await supabase.auth.verifyOtp(
                tokenHash
                  ? { token_hash: tokenHash, type: 'recovery' }
                  : { token: token as string, type: 'recovery', email: queryParams.get('email') || '' }
              );
              if (error) throw error;
            }
          }
        }

        // Clean sensitive params out of the URL
        window.history.replaceState({}, document.title, '/reset-password');

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        if (data?.session) {
          setReady(true);
        } else {
          setError('Your reset link is invalid or has expired. Please request a new one.');
        }
      } catch (err: unknown) {
        logger.error('Reset link handling failed:', err);
        if (!cancelled) {
          setError(getErrorMessage(err) || 'Your reset link is invalid or has expired.');
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    establishSession();
    return () => {
      cancelled = true;
    };
  }, []);

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

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        logger.error('Error updating password:', updateError);
        setError(updateError.message || 'Failed to update password. Please try again.');
      } else {
        toast({
          title: 'Password updated',
          description: 'Your password has been reset. Please log in with your new password.',
        });
        await supabase.auth.signOut();
        navigate('/auth', { replace: true });
      }
    } catch (err: unknown) {
      logger.error('Exception during password update:', err);
      setError(getErrorMessage(err) || 'An unexpected error occurred. Please try again.');
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

        {checking ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
          </div>
        ) : ready ? (
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
              disabled={loading}
            >
              <Lock className="w-4 h-4 mr-2" />
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Button>
          </form>
        ) : (
          <div className="text-center py-2">
            <p className="text-white mb-4">Request a new password reset link to continue.</p>
            <Button
              onClick={() => navigate('/auth', { state: { view: 'forgot-password' } })}
              className="bg-primary hover:bg-primary/90"
            >
              Request New Reset Link
            </Button>
          </div>
        )}

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
