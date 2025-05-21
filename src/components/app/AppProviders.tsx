
import React from 'react';
// Remove: import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserIdsProvider } from '@/contexts/UserIdsContext';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { queryClient } from '@/data/queryClient';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { PunishmentsProvider } from '@/contexts/PunishmentsContext';

export const AppProviders: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return (
    // <Router> Removed this wrapper
      <QueryClientProvider client={queryClient}>
        <NetworkStatusProvider>
          <AuthProvider>
            <UserIdsProvider>
              <RewardsProvider>
                <PunishmentsProvider>
                  <OfflineBanner />
                  {children}
                  <SonnerToaster richColors closeButton />
                </PunishmentsProvider>
              </RewardsProvider>
            </UserIdsProvider>
          </AuthProvider>
        </NetworkStatusProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    // </Router> Removed this closing tag
  );
};
