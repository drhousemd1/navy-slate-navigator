
import React from 'react';
import AppLayout from '../components/AppLayout';
import { APP_CONFIG } from '../config/constants';

const Index: React.FC = () => {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center p-6 animate-slide-up flex flex-col items-center">
          {/* App Logo */}
          <div className="mb-6 w-full max-w-[240px] sm:max-w-[320px]">
            <img 
              src={APP_CONFIG.logoUrl} 
              alt="App Logo" 
              className="w-full h-auto object-contain"
              onError={(e) => {
                console.error('Failed to load logo image');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          <h1 className="text-3xl font-semibold text-white mb-4">Welcome</h1>
          <p className="text-nav-inactive">
            Select an option from the navigation bar below
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
