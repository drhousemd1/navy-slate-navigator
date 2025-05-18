
import React from 'react';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/data/queryClient';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
// Import createAsyncStoragePersister instead of createSyncStoragePersister
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { APP_CACHE_VERSION } from '@/lib/react-query-config';

interface AppProvidersProps {
  children: React.ReactNode;
}

// Use createAsyncStoragePersister
const persister = createAsyncStoragePersister({
  storage: localforage,
  key: 'APP_QUERY_CACHE', // Optional: custom key for storage
  // serialize and deserialize can be added here if using complex types like Date, Map, Set with superjson for example
  // throttleTime: 1000, // Optional: Throttle time for writing to storage
});

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: APP_CACHE_VERSION,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week, persisted data older than this will be discarded
      }}
      onSuccess={() => {
        // resumeMutations must be called after hydration to resume paused mutations
        queryClient.resumePausedMutations().then(() => {
          console.log('Persisted queries hydrated and paused mutations resumed.');
        }).catch(error => {
          console.error('Error resuming paused mutations after hydration:', error);
        });
      }}
    >
      <NetworkStatusProvider>
        <RewardsProvider>
          {children}
          <OfflineBanner />
          <Toaster />
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </RewardsProvider>
      </NetworkStatusProvider>
    </PersistQueryClientProvider>
  );
};

