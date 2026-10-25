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

  // Wait for auth initialization before deciding, so signed-in users aren't bounced to /auth
  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    logger.debug(`ProtectedRoute: User not authenticated, redirecting from ${location.pathname} to /auth`);
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
