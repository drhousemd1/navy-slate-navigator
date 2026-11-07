import React, { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import { supabase, supabaseBackendId, supabaseAuthStorageKey, signOutCurrentSession } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { sameSessionOwner, sessionOwner, storedSessionOwner } from '@/lib/ownedSignOut';
import { updateRecoveryPassword } from './recoveryPassword';

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const recoverySession = useRef<Session | null>(null);
  const cleanupSession = useRef<Session | null>(null);
  const mounted = useRef(false);
  const operation = useRef(false);
  const navigate = useNavigate();
  const stillOwnsSession = (session: Session) => sameSessionOwner(
    sessionOwner(supabaseBackendId, session), storedSessionOwner(supabaseBackendId, supabaseAuthStorageKey, localStorage));
  const invalidateForm = () => {
    setReady(false); setNewPassword(''); setConfirmPassword('');
    setError('Your sign-in changed. This recovery form can no longer be used.');
  };

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;

    const establishSession = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);
        // Undefined means this page did not establish a session from a link.
        // An explicit link result must never be replaced by a later sign-in.
        let establishedSession: Session | null | undefined;

        const errorDescription =
          hashParams.get('error_description') || queryParams.get('error_description');
        if (errorDescription) {
          throw new Error(errorDescription);
        }

        // 1) Implicit flow: #access_token=...&refresh_token=...
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          establishedSession = data.session;
        } else {
          // 2) PKCE flow: ?code=...
          const code = queryParams.get('code');
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            establishedSession = data.session;
          } else {
            // 3) Token hash flow: ?token_hash=...&type=recovery
            const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
            const token = queryParams.get('token');
            if (tokenHash || token) {
              const { data, error } = await supabase.auth.verifyOtp(
                tokenHash
                  ? { token_hash: tokenHash, type: 'recovery' }
                  : { token: token as string, type: 'recovery', email: queryParams.get('email') || '' }
              );
              if (error) throw error;
              establishedSession = data.session;
            }
          }
        }

        // Clean sensitive params out of the URL
        window.history.replaceState({}, document.title, '/reset-password');

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) throw sessionError;

        const matchesLink = establishedSession === undefined || sameSessionOwner(
          sessionOwner(supabaseBackendId, establishedSession), sessionOwner(supabaseBackendId, data.session));
        if (data?.session && matchesLink && stillOwnsSession(data.session)) {
          recoverySession.current = data.session;
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
      mounted.current = false;
    };
  }, []);

  const finishSignOut = async (session: Session) => {
    try {
      const result = await signOutCurrentSession(session);
      if (!mounted.current) return;
      // A replacement (including a new session for the same account) owns its
      // own navigation. Also check synchronously after the awaited cleanup.
      if (result === 'replacement' || localStorage.getItem(supabaseAuthStorageKey) !== null) {
        invalidateForm(); return;
      }
      cleanupSession.current = null;
      toast({ title: 'Password updated', description: 'Your password has been reset. Please log in with your new password.' });
      navigate('/auth', { replace: true });
    } catch {
      if (!mounted.current) return;
      if (!stillOwnsSession(session)) { invalidateForm(); return; }
      setError('Your password was updated, but signing out could not be completed. Retry signing out below; your password will not be changed again.');
    }
  };

  const retrySignOut = async () => {
    if (operation.current || !cleanupSession.current) return;
    operation.current = true; setLoading(true); setError(null);
    try { await finishSignOut(cleanupSession.current); }
    finally { operation.current = false; if (mounted.current) setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (operation.current) return;
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

    operation.current = true; setLoading(true);
    try {
      const captured = recoverySession.current;
      if (!captured || !stillOwnsSession(captured)) { invalidateForm(); return; }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted.current) return;
      const current = data.session;
      if (sessionError) throw sessionError;
      if (!current || !sameSessionOwner(sessionOwner(supabaseBackendId, captured), sessionOwner(supabaseBackendId, current)) || !stillOwnsSession(current)) {
        invalidateForm(); return;
      }
      await updateRecoveryPassword(current, newPassword);
      cleanupSession.current = current;
      if (mounted.current) { setPasswordUpdated(true); setNewPassword(''); setConfirmPassword(''); }
      await finishSignOut(current);
    } catch (err: unknown) {
      if (!mounted.current) return;
      if (recoverySession.current && !stillOwnsSession(recoverySession.current)) invalidateForm();
      else setError(getErrorMessage(err) || 'An unexpected error occurred. Please try again.');
    } finally {
      operation.current = false;
      if (mounted.current) setLoading(false);
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
        ) : ready && passwordUpdated ? (
          <div className="space-y-4">
            <p className="text-white">Your password has been updated.</p>
            <Button onClick={() => void retrySignOut()} disabled={loading} className="w-full bg-primary hover:bg-primary/90">
              {loading ? 'Signing out…' : 'Finish signing out'}
            </Button>
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
