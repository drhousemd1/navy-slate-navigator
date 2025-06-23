
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { APP_CONFIG } from '../config/constants';
import { logger } from '@/lib/logger';

const Index: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  return (
    <AppLayout>
      <div className="overflow-x-hidden w-full max-w-full h-full">
        <div className="flex flex-col items-center justify-center h-full overflow-x-hidden">
          <div className="text-center p-6 animate-slide-up flex flex-col items-center w-full max-w-full">
            {/* App Logo */}
            {!imageError && (
              <div className="mb-6 w-full max-w-[240px]">
                <img 
                  src={APP_CONFIG.logoUrl} 
                  alt="TaskMaster Logo" 
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    logger.error('Failed to load logo image', e);
                    setImageError(true);
                  }}
                />
              </div>
            )}
            
            <p className="text-nav-inactive break-words w-full max-w-full">
              Select an option from the navigation bar below to begin.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
