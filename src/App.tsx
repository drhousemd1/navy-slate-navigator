import React from 'react';
import AppRoutes from './AppRoutes';
import { OfflineBanner } from './components/OfflineBanner';
import Hydrate from './components/Hydrate';

function App() {
  return (
    <Hydrate fallbackMessage="Failed to load application data. Please try clearing site data or contact support.">
      <AppRoutes />
      <OfflineBanner />
    </Hydrate>
  );
}

export default App;
