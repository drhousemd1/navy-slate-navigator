import React from 'react';
import AppRoutes from './AppRoutes';
import Hydrate from './components/Hydrate';

function App() {
  return (
    <Hydrate fallbackMessage="Application data could not be loaded. Retry or contact support. Keep site data to preserve saved actions.">
      <AppRoutes />
    </Hydrate>
  );
}

export default App;
