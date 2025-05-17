
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
    // Priority: location.state, then specific path, then default
    if (location.state && location.state.view) {
      setAuthView(location.state.view as AuthView);
    } else if (location.pathname === '/forgot-password') {
      setAuthView('forgot-password');
    } else {
      // Default to 'login' for any other case (e.g., path is '/auth')
      setAuthView('login');
    }
  }, [location.pathname, location.state]); // Depend on pathname and state

  if (loading) {
    // Optional: Show a loading indicator while auth state is being determined
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-4">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('Auth page: User is authenticated, redirecting to home');
    // If navigating from a specific page, try to go back, otherwise to home
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // Render specific view based on authView state
  if (authView === "forgot-password") {
    return <ForgotPasswordView onBackClick={() => setAuthView("login")} />;
  }

  // Default view: Login/Signup
  return <LoginSignupView currentView={authView} onViewChange={setAuthView} />;
};

export default Auth;

