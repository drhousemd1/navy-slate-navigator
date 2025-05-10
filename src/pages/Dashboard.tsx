
import React from 'react';
import AppLayout from '../components/AppLayout';

const Dashboard: React.FC = () => {
  return (
    <AppLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>
        <div className="bg-card rounded-lg p-4">
          <p>Welcome to your dashboard!</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
