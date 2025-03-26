
import React from 'react';
import AppLayout from '../components/AppLayout';

const Encyclopedia: React.FC = () => {
  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="max-w-screen-lg mx-auto">
          <h1 className="text-2xl font-semibold text-white mb-6">Encyclopedia</h1>
          <div className="bg-navy border border-light-navy rounded-lg p-6">
            <p className="text-gray-300">Welcome to the encyclopedia. This is where you'll find information about the system and how it works.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Encyclopedia;
