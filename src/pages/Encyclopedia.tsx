
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import EncyclopediaTile from '../components/encyclopedia/EncyclopediaTile';
import EditEncyclopediaModal, { EncyclopediaEntry } from '../components/encyclopedia/EditEncyclopediaModal';

// This would be replaced with a real environment check or auth check in a production app
const isAdminMode = () => {
  // For demo purposes, this could be controlled by a localStorage setting, environment variable, or auth state
  return true; // Set to true for now to show the edit functionality
};

// Initial encyclopedia entries - in a real app, this would come from a database
const initialEntries: EncyclopediaEntry[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    subtext: "Learn the basics of how to use the system effectively.",
    focal_point_x: 50,
    focal_point_y: 50,
    opacity: 100
  },
  {
    id: "key-features",
    title: "Key Features",
    subtext: "Explore the powerful features available in the system.",
    focal_point_x: 50,
    focal_point_y: 50,
    opacity: 100
  }
];

const Encyclopedia: React.FC = () => {
  const [entries, setEntries] = useState<EncyclopediaEntry[]>(initialEntries);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<EncyclopediaEntry | undefined>(undefined);

  const handleEditTile = (id: string) => {
    const entryToEdit = entries.find(entry => entry.id === id);
    if (entryToEdit) {
      setCurrentEntry(entryToEdit);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEntry = (updatedEntry: EncyclopediaEntry) => {
    setEntries(entries.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    ));
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setCurrentEntry(undefined);
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
            {entries.map(entry => (
              <EncyclopediaTile 
                key={entry.id}
                title={entry.title} 
                subtext={entry.subtext}
                showEditIcon={isAdminMode()}
                onEdit={() => handleEditTile(entry.id)}
                imageUrl={entry.image_url}
                focalPointX={entry.focal_point_x}
                focalPointY={entry.focal_point_y}
                opacity={entry.opacity}
              />
            ))}
          </div>
        </div>
      </div>

      <EditEncyclopediaModal
        isOpen={isEditModalOpen}
        onClose={closeModal}
        onSave={handleSaveEntry}
        entry={currentEntry}
      />
    </AppLayout>
  );
};

export default Encyclopedia;
