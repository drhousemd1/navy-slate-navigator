
import React from 'react';
import AppLayout from '../components/AppLayout';

const Rewards: React.FC = () => {
  return (
    <AppLayout>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 animate-slide-up">
          <h1 className="text-3xl font-semibold text-white mb-4">Rewards</h1>
          <p className="text-nav-inactive">Rewards page content will go here</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Rewards;
