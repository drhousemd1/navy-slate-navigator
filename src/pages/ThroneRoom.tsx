
import React from 'react';
import AppLayout from '../components/AppLayout';

const ThroneRoom: React.FC = () => {
  return (
    <AppLayout>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 animate-slide-up">
          <h1 className="text-3xl font-semibold text-white mb-4">Throne Room</h1>
          <p className="text-nav-inactive">Throne Room page content will go here</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default ThroneRoom;
