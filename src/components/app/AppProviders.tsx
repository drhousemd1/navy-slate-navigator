import React from 'react';
// import { BrowserRouter as Router } from 'react-router-dom'; // This line was correctly commented out
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserIdsProvider } from '@/contexts/UserIdsContext';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/data/queryClient';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { PunishmentsProvider } from '@/contexts/punishments/PunishmentsProvider';
import { ColorSchemeProvider } from '@/contexts/ColorSchemeContext';

export const AppProviders: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkStatusProvider>
        <AuthProvider>
          <ColorSchemeProvider>
            <UserIdsProvider>
              <RewardsProvider>
                <PunishmentsProvider>
                  <OfflineBanner />
                  {children}
                  <Toaster />
                </PunishmentsProvider>
              </RewardsProvider>
            </UserIdsProvider>
          </ColorSchemeProvider>
        </AuthProvider>
      </NetworkStatusProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
