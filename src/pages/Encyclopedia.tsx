
import React from 'react';
import AppLayout from '../components/AppLayout';
import EncyclopediaTile from '../components/encyclopedia/EncyclopediaTile';

const Encyclopedia: React.FC = () => {
  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="max-w-screen-lg mx-auto">
          <h1 className="text-2xl font-semibold text-white mb-6">Encyclopedia</h1>
          
          <div className="bg-navy border border-light-navy rounded-lg p-6 mb-6">
            <p className="text-gray-300">Welcome to the encyclopedia. This is where you'll find information about the system and how it works.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EncyclopediaTile 
              title="Getting Started" 
              subtext="Learn the basics of how to use the system effectively."
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Encyclopedia;
