
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './data/queryClient';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/auth';
import App from './App.tsx';
import './index.css';
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
