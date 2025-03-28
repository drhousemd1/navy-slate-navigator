
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthView } from './types';
import { LoginSignupView } from './LoginSignupView';
import { ForgotPasswordView } from './ForgotPasswordView';

const Auth: React.FC = () => {
  const [authView, setAuthView] = React.useState<AuthView>("login");
  const { isAuthenticated } = useAuth();

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
