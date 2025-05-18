
import React from 'react';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/data/queryClient';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkStatusProvider>
        <RewardsProvider>
          {children}
          <OfflineBanner />
          <Toaster />
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </RewardsProvider>
      </NetworkStatusProvider>
    </QueryClientProvider>
  );
};
