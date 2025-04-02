
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect non-admin users after auth check is complete
    if (!loading && isAuthenticated && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-6">
            <p className="text-white">Loading the Throne Room...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show access denied message within the page rather than redirecting
  // This ensures the page is mounted and the navigation item is active
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Alert className="max-w-md bg-navy border-light-navy">
            <AlertTitle className="text-white">Access Restricted</AlertTitle>
            <AlertDescription className="text-nav-inactive">
              Only administrators can access this page.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 animate-slide-up">
          <h1 className="text-3xl font-semibold text-white mb-4">Admin Throne Room</h1>
          <p className="text-nav-inactive mb-4">Welcome to the admin control panel</p>
          
          <div className="bg-navy border border-light-navy rounded-lg p-6 mt-6">
            <h2 className="text-xl font-medium text-white mb-3">Admin Actions</h2>
            <p className="text-nav-inactive">This area is restricted to administrators only.</p>
            <p className="text-green-400 mt-4">Your account has administrator privileges.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ThroneRoom;
