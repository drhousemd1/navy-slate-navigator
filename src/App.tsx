
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/auth/AuthContext';
import AppRoutes from './AppRoutes';
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { queryClient } from '../data/queryClient';
import { APP_CACHE_VERSION } from '../lib/react-query-config';

// Configure localforage if not already done elsewhere, though useIndexedDB already does.
// This ensures consistency if localforage is used in multiple places.
localforage.config({
  name: 'kingdom-app', // Should match the name in useIndexedDB.ts
  storeName: 'app_data_react_query', // Use a distinct store for RQ persister
  version: 1.0,
  description: 'React Query offline cache'
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: localforage,
  key: 'REACT_QUERY_OFFLINE_CACHE', // Default or custom key
  // serialize and deserialize are handled by default (JSON.stringify/parse)
});

function App() {
  return (
    <Router>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          buster: APP_CACHE_VERSION,
          maxAge: 1000 * 60 * 60 * 24 * 7, // Cache data for 1 week
        }}
        onSuccess={() => {
          // Resume paused mutations after the cache is restored
          queryClient.resumePausedMutations().then(() => {
            // Optionally, you might want to invalidate some queries
            // if new data should be fetched after resuming.
            // For now, we'll rely on the existing sync mechanisms.
            console.log("Persisted cache restored, mutations resumed.");
          });
        }}
      >
        <AuthProvider>
          <NetworkStatusProvider>
            <ErrorBoundary fallbackMessage="An unexpected error occurred in the application.">
              <AppRoutes />
            </ErrorBoundary>
            <OfflineBanner />
            <Toaster />
          </NetworkStatusProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </Router>
  );
}

export default App;
