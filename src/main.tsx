
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from "./serviceWorkerRegistration";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './data/queryClient'; // Import the queryClient

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

registerSW();
