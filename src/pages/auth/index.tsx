
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { AuthView } from './types';
import { LoginSignupView } from './LoginSignupView';
import { ForgotPasswordView } from './ForgotPasswordView';

const Auth: React.FC = () => {
  const [authView, setAuthView] = React.useState<AuthView>("login");
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (location.state && location.state.view) {
      setAuthView(location.state.view as AuthView);
    }
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-navy">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (authView === "forgot-password") {
    return <ForgotPasswordView onBackClick={() => setAuthView("login")} />;
  }

  return <LoginSignupView currentView={authView} onViewChange={setAuthView} />;
};

export default Auth;
