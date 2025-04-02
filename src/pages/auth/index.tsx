
// Update import path for the auth hook
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { AuthView } from './types';
import { LoginSignupView } from './LoginSignupView';
import { ForgotPasswordView } from './ForgotPasswordView';

const Auth: React.FC = () => {
  const [authView, setAuthView] = React.useState<AuthView>("login");
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Check if there's a view state passed via navigation
  React.useEffect(() => {
    if (location.state && location.state.view) {
      setAuthView(location.state.view as AuthView);
    }
  }, [location]);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  // Show the appropriate view based on the authView state
  if (authView === "forgot-password") {
    return <ForgotPasswordView onBackClick={() => setAuthView("login")} />;
  }

  // Default view: Login/Signup
  return <LoginSignupView currentView={authView} onViewChange={setAuthView} />;
};

export default Auth;
