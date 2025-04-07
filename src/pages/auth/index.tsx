
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
  let route;
  let routeState;
  
  // Try to get location, but handle cases where Router context might not be available
  try {
    const location = useLocation();
    route = location.pathname;
    routeState = location.state;
    
    // Check if there's a view state passed via navigation
    React.useEffect(() => {
      if (location.state && location.state.view) {
        setAuthView(location.state.view as AuthView);
      }
    }, [location]);
  } catch (error) {
    console.error("Router context not available:", error);
    route = "/auth";
    routeState = null;
  }
  
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

// Wrap the Auth component in a BrowserRouter to ensure Router context is available
const AuthWithRouter = () => {
  return (
    <BrowserRouter>
      <Auth />
    </BrowserRouter>
  );
};

export default Auth;
