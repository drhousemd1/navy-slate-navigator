import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull, Loader2 } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments } from '../contexts/PunishmentsContext';
import PunishmentEditor from '../components/PunishmentEditor';
import { useSyncManager } from '@/hooks/useSyncManager';

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { punishments, loading, error, createPunishment, updatePunishment } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<any>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Use the sync manager with minimal refreshing
  const { syncNow } = useSyncManager({ 
    intervalMs: 60000, // Longer interval to avoid excessive refreshing
    enabled: true 
  });
  
  // Track initial mount and set loading state appropriately
  useEffect(() => {
    // Consider initial load complete after a short delay
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  
  // Only show loader on initial load when no cached data
  const showLoader = isInitialLoad && loading && punishments.length === 0;
  
  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };
  
  useEffect(() => {
    contentRef.current = {
      handleAddNewPunishment
    };
    
    return () => {
      contentRef.current = {};
    };
  }, [contentRef]);
  
  const handleEditPunishment = (punishment: any) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishment = async (punishmentData: any) => {
    try {
      if (punishmentData.id) {
        // Update existing punishment
        await updatePunishment(punishmentData.id, punishmentData);
      } else {
        // Create new punishment
        await createPunishment(punishmentData);
      }
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      console.error("Error saving punishment:", error);
    }
  };
  
  // Show cached data with error message if we have an error but cached data
  if (error && punishments.length > 0) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="bg-red-900/20 border border-red-700 rounded p-4 mb-4 text-red-300">
          <p>Error refreshing data. Showing cached punishments.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {punishments.map((punishment) => (
            <PunishmentCard
              key={punishment.id}
              {...punishment}
              // Pass the function directly, no need for onEdit callback
              onEdit={() => handleEditPunishment(punishment)}
            />
          ))}
        </div>
        
        <PunishmentEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          punishmentData={currentPunishment}
          onSave={handleSavePunishment}
        />
      </div>
    );
  }
  
  // Show loading state when appropriate
  if (showLoader) {
    return (
      <div className="p-4 pt-6 flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <p className="mt-4 text-white">Loading punishments...</p>
      </div>
    );
  }
  
  // Show empty state
  if (!loading && punishments.length === 0) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Skull className="h-16 w-16 text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Punishments Yet</h3>
          <p className="text-gray-400 mb-4">Create your first punishment to get started</p>
          <button
            onClick={handleAddNewPunishment}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition-colors"
          >
            Create Punishment
          </button>
        </div>
        
        <PunishmentEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          punishmentData={currentPunishment}
          onSave={handleSavePunishment}
        />
      </div>
    );
  }
  
  // Normal render with data
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {punishments.map((punishment) => (
          <PunishmentCard
            key={punishment.id}
            {...punishment}
            onEdit={() => handleEditPunishment(punishment)}
          />
        ))}
      </div>
      
      <PunishmentEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        punishmentData={currentPunishment}
        onSave={handleSavePunishment}
      />
    </div>
  );
};

const Punishments: React.FC = () => {
  const contentRef = useRef<{ handleAddNewPunishment?: () => void }>({});
  
  const handleAddNewPunishment = () => {
    if (contentRef.current.handleAddNewPunishment) {
      contentRef.current.handleAddNewPunishment();
    }
  };
  
  return (
    <AppLayout onAddNewItem={handleAddNewPunishment}>
      <RewardsProvider>
        <PunishmentsProvider>
          <PunishmentsContent contentRef={contentRef} />
        </PunishmentsProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Punishments;
