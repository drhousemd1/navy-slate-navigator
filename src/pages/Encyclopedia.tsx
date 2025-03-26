
import React from 'react';
import AppLayout from '../components/AppLayout';
import EncyclopediaTile from '../components/encyclopedia/EncyclopediaTile';

// This would be replaced with a real environment check or auth check in a production app
const isAdminMode = () => {
  // For demo purposes, this could be controlled by a localStorage setting, environment variable, or auth state
  return true; // Set to true for now to show the edit functionality
};

const Encyclopedia: React.FC = () => {
  const handleEditTile = (id: string) => {
    console.log(`Editing tile with ID: ${id}`);
    // Future implementation: Open editor modal or navigate to edit page
  };

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
              showEditIcon={isAdminMode()}
              onEdit={() => handleEditTile("getting-started")}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Encyclopedia;
