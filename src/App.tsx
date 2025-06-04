import React from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { OfflineBanner } from './components/OfflineBanner';
import Hydrate from './components/Hydrate';

function App() {
  return (
    <Hydrate fallbackMessage="Failed to load application data. Please try clearing site data or contact support.">
      <Toaster />
      <AppRoutes />
      <OfflineBanner />
    </Hydrate>
  );
}

export default App;
