
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { queryClient } from './data/queryClient';
import { APP_CACHE_VERSION } from './lib/react-query-config';
import './index.css'; // Global styles
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';

// Configure localforage if not already done elsewhere (it's configured in useIndexedDB but good to be explicit)
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'appData', // Consistent with useIndexedDB
  storeName: 'queryCache', // Specific store for React Query cache
  description: 'React Query cache for the application',
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: localforage,
  throttleTime: 1000, // How often to persist, in milliseconds
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        buster: APP_CACHE_VERSION, // Used to invalidate cache when app version changes
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
