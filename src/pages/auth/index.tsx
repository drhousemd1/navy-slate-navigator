
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { AuthView } from './types';
import { LoginSignupView } from './LoginSignupView';
import { ForgotPasswordView } from './ForgotPasswordView';
import { logger } from '@/lib/logger';

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

  // No loading screen - if authenticated, redirect immediately
  if (isAuthenticated) {
    logger.debug('Auth page: User is authenticated, redirecting to home');
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // Always show auth UI immediately, even if still loading
  if (authView === "forgot-password") {
    return <ForgotPasswordView onBackClick={() => setAuthView("login")} />;
  }

  return <LoginSignupView currentView={authView} onViewChange={setAuthView} />;
};

export default Auth;
