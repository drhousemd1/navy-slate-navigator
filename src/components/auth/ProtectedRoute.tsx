
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // You might want to render a more sophisticated loading spinner here
    return (
      <div className="flex items-center justify-center h-screen bg-navy text-white">
        Loading authentication status...
      </div>
    );
  }

  if (!isAuthenticated) {
    logger.debug(`ProtectedRoute: User not authenticated. Redirecting from ${location.pathname} to /auth`);
    // Redirect them to the /auth page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after they
    // log in, which is a common UX pattern.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
