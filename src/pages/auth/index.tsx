
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { AuthView } from './types';
import { LoginSignupView } from './LoginSignupView';
import { ForgotPasswordView } from './ForgotPasswordView';
import { logger } from '@/lib/logger';

type FromLocation = { pathname?: string; search?: string; hash?: string };

const getReturnPath = (state: unknown): string => {
  const from = (state as { from?: FromLocation } | null)?.from;
  const pathname = from?.pathname;
  if (!pathname || pathname === '/auth' || pathname === '/forgot-password') return '/';
  return `${pathname}${from?.search ?? ''}${from?.hash ?? ''}`;
};

const Auth: React.FC = () => {
  const [authView, setAuthView] = React.useState<AuthView>("login");
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (location.state && location.state.view) {
      setAuthView(location.state.view as AuthView);
    } else if (location.pathname === '/forgot-password') {
      setAuthView('forgot-password');
    } else if (location.pathname === '/signup') {
      setAuthView('signup');
    } else {
      setAuthView('login');
    }
  }, [location.pathname, location.state]);

  // Wait for auth initialization so an existing session doesn't flash the login form
  if (loading) {
    return null;
  }

  // Single owner of post-login navigation: return to the originally requested location
  if (isAuthenticated) {
    const target = getReturnPath(location.state);
    logger.debug(`Auth page: User is authenticated, redirecting to ${target}`);
    return <Navigate to={target} replace />;
  }

  if (authView === "forgot-password") {
    return <ForgotPasswordView onBackClick={() => setAuthView("login")} />;
  }

  return <LoginSignupView currentView={authView} onViewChange={setAuthView} />;
};

export default Auth;
