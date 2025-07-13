
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AppProviders } from '@/components/app/AppProviders';
import { BrowserRouter } from 'react-router-dom';
import { register } from './serviceWorkerRegistration';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker
register({
  onSuccess: (registration) => {
    console.log('Service Worker registered successfully:', registration);
  },
  onUpdate: (registration) => {
    console.log('Service Worker updated:', registration);
  },
});

