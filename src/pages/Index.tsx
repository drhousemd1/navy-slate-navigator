
import React from 'react';
import AppLayout from '../components/AppLayout';
import { AppLogo } from '@/components/common/AppLogo';

const Index: React.FC = () => {
  return (
    <AppLayout>
      <div className="overflow-x-hidden w-full max-w-full h-full">
        <div className="flex flex-col items-center justify-center h-full overflow-x-hidden">
          <div className="text-center p-6 animate-slide-up flex flex-col items-center w-full max-w-full">
            {/* App Logo */}
            <div className="mb-6 w-full max-w-[240px] h-[240px]">
              <AppLogo 
                size="responsive" 
                alt="Playful Obedience Logo"
                className="w-full h-full"
              />
            </div>
            
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
