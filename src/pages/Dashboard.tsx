
import React from 'react';
import AppLayout from '../components/AppLayout'; // Corrected import path

const Dashboard: React.FC = () => {
  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p>Welcome to your dashboard.</p>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
