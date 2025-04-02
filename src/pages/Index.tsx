import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { APP_CONFIG } from '../config/constants';
import { useAuth } from '../contexts/auth/AuthContext';

const Index: React.FC = () => {
  const [imageError, setImageError] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center p-6 animate-slide-up flex flex-col items-center">
          {/* App Logo */}
          {!imageError && (
            <div className="mb-6 w-full max-w-[240px]">
              <img 
                src={APP_CONFIG.logoUrl} 
                alt="TaskMaster Logo" 
                className="w-full h-auto object-contain"
                onError={(e) => {
                  console.error('Failed to load logo image');
                  setImageError(true);
                }}
              />
            </div>
          )}
          
          <p className="text-nav-inactive">
            Select an option from the navigation bar below to begin.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
