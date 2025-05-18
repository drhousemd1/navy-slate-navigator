
import React from 'react';
import AppLayout from '../components/AppLayout'; // Corrected import path

const Settings: React.FC = () => {
  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p>Manage your application settings here.</p>
      </div>
    </AppLayout>
  );
};

export default Settings;
