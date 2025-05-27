
import React, { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileNavbar from './MobileNavbar';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/Login'; // Ensure this path is correct
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Ensure this path is correct
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import OfflineBanner from '@/components/OfflineBanner';
import { logger } from '@/lib/logger';

const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const { isOnline } = useNetworkStatus();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  logger.log(`AppLayout: Auth loading: ${authLoading}, IsAuthenticated: ${isAuthenticated}`);

  if (authLoading) {
    // Enhanced global loading state for initial auth check
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <LoadingSpinner size="large" />
        <p className="ml-4 text-lg">Initializing Application...</p>
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/signup') {
    // If not authenticated and not on login/signup, show LoginPage.
    // This effectively makes LoginPage the fallback for unauthenticated users.
    // Consider redirecting to /login instead of rendering LoginPage directly for cleaner URLs.
    logger.log('AppLayout: Not authenticated, rendering LoginPage.');
    return <LoginPage />;
  }
  
  // For authenticated users or users on login/signup page
  const showNavigation = isAuthenticated && location.pathname !== '/login' && location.pathname !== '/signup';
  logger.log(`AppLayout: showNavigation: ${showNavigation}`);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground overflow-hidden">
      {showNavigation && (
        <>
          <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
          <MobileNavbar toggleSidebar={toggleSidebar} />
        </>
      )}
      
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out ${showNavigation && isSidebarOpen ? 'md:ml-64' : 'md:ml-0'} ${showNavigation ? 'pt-16 md:pt-0' : ''}`}>
        {!isOnline && <OfflineBanner />}
        <Suspense fallback={<div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default AppLayout;
