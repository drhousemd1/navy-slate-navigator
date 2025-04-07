
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { AuthView } from './types';
import { LoginSignupView } from './LoginSignupView';
import { ForgotPasswordView } from './ForgotPasswordView';
import { BrowserRouter } from 'react-router-dom';

const Auth: React.FC = () => {
  // Use state for the auth view
  const [authView, setAuthView] = React.useState<AuthView>("login");
  
  // Get location from Router context
  const location = useLocation();
  
  // Check if there's a view state passed via navigation
  React.useEffect(() => {
    if (location.state && location.state.view) {
      setAuthView(location.state.view as AuthView);
    }
  }, [location]);
  
  // Get auth state
  const { isAuthenticated, loading } = useAuth();

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
  return (
    <LoginSignupView 
      currentView={authView} 
      onViewChange={setAuthView} 
    />
  );
};

// Export the Auth component wrapped with BrowserRouter
const AuthWithRouter = () => {
  return (
    <BrowserRouter>
      <Auth />
    </BrowserRouter>
  );
};

export default AuthWithRouter;
