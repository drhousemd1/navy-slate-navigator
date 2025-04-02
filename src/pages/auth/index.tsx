
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthView } from './types';
import { LoginSignupView } from './LoginSignupView';
import { ForgotPasswordView } from './ForgotPasswordView';

const Auth: React.FC = () => {
  const [authView, setAuthView] = React.useState<AuthView>("login");
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Check if there's a view state passed via navigation
  React.useEffect(() => {
    if (location.state && location.state.view) {
      setAuthView(location.state.view as AuthView);
    }
  }, [location]);

  console.log("Auth page - authenticated:", isAuthenticated, "loading:", loading);

  // Only redirect if we're sure about authentication status
  if (isAuthenticated && !loading) {
    console.log('Auth page: User is authenticated, redirecting to home');
    return <Navigate to="/" />;
  }

  // Only render auth UI if we're sure user is not authenticated or we're still loading
  if (authView === "forgot-password") {
    return <ForgotPasswordView onBackClick={() => setAuthView("login")} />;
  }

  // Default view: Login/Signup
  return <LoginSignupView currentView={authView} onViewChange={setAuthView} />;
};

export default Auth;
