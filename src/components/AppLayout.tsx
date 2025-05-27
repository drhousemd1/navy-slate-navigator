
import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileNavbar from './MobileNavbar';
import AccountSheet from './AccountSheet'; // Added import
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import AppUpdateNotification from '@/components/app/AppUpdateNotification';
import { useNetworkStatus } // Using named import
from '@/hooks/useNetworkStatus'; // Corrected path
import SyncStatusIndicator from '@/components/app/SyncStatusIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/lib/logger'; // Added logger

const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const location = useLocation();
  const { isOnline } = useNetworkStatus();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Additional effect logic can go here if needed
  }, [location]);

  const handleSyncStatusChange = (status: string) => {
    // This function is a prop for SyncStatusIndicator.
    // It could be used to update AppLayout's state or perform other actions based on sync status.
    logger.log("Sync status changed:", status);
  };
  
  // Main content: Outlet for nested routes or children if provided
  const mainContent = children || <Outlet />;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-background border-b border-border/40 p-3 flex justify-between items-center fixed top-0 left-0 right-0 z-50 h-[60px]">
        <div className="flex items-center">
          {/* Placeholder for a logo or app title if needed */}
          <h1 className="text-xl font-semibold text-foreground">My App</h1>
        </div>
        <div className="flex items-center space-x-2">
          <SyncStatusIndicator onStatusChange={handleSyncStatusChange} />
          {!isOnline && (
            <span className="text-xs text-destructive-foreground bg-destructive px-2 py-1 rounded">
              Offline
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsAccountSheetOpen(true)}>
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </header>

      {/* Add a spacer div to push content below the fixed header */}
      <div className="h-[60px] w-full flex-shrink-0" /> 

      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<div className="p-4">Loading page...</div>}>
          {mainContent}
        </Suspense>
      </main>

      {isMobile && <MobileNavbar />}
      
      <AccountSheet isOpen={isAccountSheetOpen} onOpenChange={setIsAccountSheetOpen} />
      <AppUpdateNotification />
    </div>
  );
};

export default AppLayout;
