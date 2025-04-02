
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { WeeklyMetricsChart } from '@/components/throne/WeeklyMetricsChart';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TooltipProvider, 
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const navigate = useNavigate();
  const [isRoleChecked, setIsRoleChecked] = useState(false);

  console.log('ThroneRoom rendering: Admin status:', isAdmin, 'Auth status:', isAuthenticated);

  // Make sure role check runs when authentication is confirmed
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('ThroneRoom: User authenticated, checking role');
      checkUserRole().then(() => {
        console.log('ThroneRoom: Role check completed');
        setIsRoleChecked(true);
      });
    }
  }, [isAuthenticated, loading, checkUserRole]);

  // Handle unauthenticated users
  useEffect(() => {
    // Only redirect if we know for sure user isn't authenticated (not when still loading)
    if (!loading && !isAuthenticated) {
      console.log('ThroneRoom: User is not authenticated, redirecting to login');
      navigate('/auth');
    }
  }, [isAuthenticated, loading, navigate]);

  // Handle non-admin users
  useEffect(() => {
    // Only redirect if we've checked roles and confirmed user isn't admin
    if (isRoleChecked && isAuthenticated && !isAdmin) {
      console.log('ThroneRoom: User is not admin, redirecting to home');
      navigate('/');
    }
  }, [isAdmin, isAuthenticated, isRoleChecked, navigate]);

  // Show loading state while checking authentication or roles
  if (loading || (isAuthenticated && !isRoleChecked)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-6">
            <h1 className="text-white text-xl mb-2">Throne Room - Loading</h1>
            <Skeleton className="h-12 w-48 bg-light-navy/30 rounded mx-auto mb-4" />
            <Skeleton className="h-4 w-64 bg-light-navy/30 rounded mx-auto" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Handle unauthenticated case
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Alert className="max-w-md bg-navy border-light-navy">
              <AlertTitle className="text-white">Authentication Required</AlertTitle>
              <AlertDescription className="text-nav-inactive">
                Please log in to access this page.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Handle non-admin users
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Alert className="max-w-md bg-navy border-light-navy">
              <AlertTitle className="text-white">Access Restricted</AlertTitle>
              <AlertDescription className="text-nav-inactive">
                Only administrators can access this page.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show admin content for authenticated admin users
  return (
    <AppLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Admin Throne Room</h1>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-nav-inactive hover:text-white">
                  <InfoIcon size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-dark-navy border-light-navy text-white max-w-xs">
                This page displays metrics for tasks, rewards, and punishments. Only admins can access this data.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <p className="text-nav-inactive mb-4">Welcome to your command center where you can track activities and manage your domain</p>
        
        <div className="space-y-6">
          {/* Weekly metrics chart */}
          <WeeklyMetricsChart />
          
          <div className="bg-navy border border-light-navy rounded-lg p-6">
            <h2 className="text-xl font-medium text-white mb-3">Admin Privileges</h2>
            <p className="text-nav-inactive">This area is restricted to administrators only.</p>
            <p className="text-green-400 mt-4">Your account has administrator privileges.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ThroneRoom;
