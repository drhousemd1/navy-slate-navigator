
import React from 'react';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
// OfflineBanner is already rendered in App.tsx, rendering it here too would be duplicative.
// import { OfflineBanner } from '@/components/OfflineBanner';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// Toaster is already rendered in App.tsx
// import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/data/queryClient';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { APP_CACHE_VERSION } from '@/lib/react-query-config';

interface AppProvidersProps {
  children: React.ReactNode;
}

const persister = createAsyncStoragePersister({
  storage: localforage,
  key: 'REACT_QUERY_OFFLINE_CACHE', // Using the more specific key
  throttleTime: 1000, // Added throttleTime
  // serialize and deserialize can be added here if using complex types like Date, Map, Set with superjson for example
});

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: APP_CACHE_VERSION,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      }}
      onSuccess={() => {
        queryClient.resumePausedMutations().then(() => {
          console.log('Persisted queries hydrated and paused mutations resumed via AppProviders.');
        }).catch(error => {
          console.error('Error resuming paused mutations after hydration in AppProviders:', error);
        });
      }}
    >
      <NetworkStatusProvider>
        <RewardsProvider>
          {children}
          {/* Toaster and OfflineBanner are rendered in App.tsx to be inside Hydrate context */}
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </RewardsProvider>
      </NetworkStatusProvider>
    </PersistQueryClientProvider>
  );
};
