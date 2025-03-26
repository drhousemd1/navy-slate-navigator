
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import EncyclopediaTile from '../components/encyclopedia/EncyclopediaTile';
import EditEncyclopediaModal, { EncyclopediaEntry } from '../components/encyclopedia/EditEncyclopediaModal';
import { useToast } from '@/hooks/use-toast';

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
    popup_text: "# Getting Started\n\nWelcome to our system! This guide will help you get up and running quickly.\n\nThe system is designed to be intuitive and easy to use, but there are a few key concepts that will help you make the most of it.\n\nTake your time to explore the different features and don't hesitate to reach out if you have any questions.",
    focal_point_x: 50,
    focal_point_y: 50,
    opacity: 100,
    title_color: '#FFFFFF',
    subtext_color: '#D1D5DB',
    highlight_effect: false
  },
  {
    id: "key-features",
    title: "Key Features",
    subtext: "Explore the powerful features available in the system.",
    popup_text: "# Key Features\n\nOur system comes packed with powerful features to help you succeed:\n\n- **Task Management**: Create, organize and track tasks efficiently\n- **Encyclopedia**: Build a knowledge base for your organization\n- **Rewards System**: Motivate users with achievements and rewards\n- **Customization**: Tailor the system to match your specific needs\n\nEach feature is designed to work seamlessly with the others, creating a cohesive experience.",
    focal_point_x: 50,
    focal_point_y: 50,
    opacity: 100,
    title_color: '#FFFFFF',
    subtext_color: '#D1D5DB',
    highlight_effect: false
  }
];

const Encyclopedia: React.FC = () => {
  const [entries, setEntries] = useState<EncyclopediaEntry[]>(initialEntries);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<EncyclopediaEntry | undefined>(undefined);
  const { toast } = useToast();

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

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
    toast({
      title: "Entry Deleted",
      description: "The encyclopedia entry has been removed."
    });
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
                popupText={entry.popup_text}
                showEditIcon={isAdminMode()}
                onEdit={() => handleEditTile(entry.id)}
                imageUrl={entry.image_url}
                focalPointX={entry.focal_point_x}
                focalPointY={entry.focal_point_y}
                opacity={entry.opacity}
                titleColor={entry.title_color}
                subtextColor={entry.subtext_color}
                highlightEffect={entry.highlight_effect}
              />
            ))}
          </div>
        </div>
      </div>

      <EditEncyclopediaModal
        isOpen={isEditModalOpen}
        onClose={closeModal}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        entry={currentEntry}
      />
    </AppLayout>
  );
};

export default Encyclopedia;
