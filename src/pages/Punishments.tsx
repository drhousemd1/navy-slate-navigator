import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull, Loader2 } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { useSyncManager } from '@/data/sync/useSyncManager';
import { usePunishments } from '@/data/queries/usePunishments';
import { PunishmentData } from '@/contexts/punishments/types';
import { queryClient } from '@/data/queryClient';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';
import { usePreloadPunishments } from "@/data/preload/usePreloadPunishments";
import { useDeletePunishment } from "@/data/mutations/useDeletePunishment";
import { useCreatePunishmentOptimistic } from '@/data/mutations/useCreatePunishmentOptimistic';
import { useUpdatePunishmentOptimistic } from '@/data/mutations/useUpdatePunishmentOptimistic';

// Preload punishments data from IndexedDB before component renders
usePreloadPunishments()();

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { punishments, isLoading, error } = usePunishments(); // Removed refetchPunishments as it's part of usePunishments
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { mutateAsync: deletePunishmentAsync } = useDeletePunishment();
  const { mutateAsync: createPunishmentAsync } = useCreatePunishmentOptimistic();
  const { mutateAsync: updatePunishmentAsync } = useUpdatePunishmentOptimistic();
  
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
  const showLoader = isInitialLoad && isLoading && punishments.length === 0;
  
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
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishment = async (punishmentData: Partial<PunishmentData>) => {
    try {
      if (punishmentData.id) {
        // Update existing punishment
        await updatePunishmentAsync({
          id: punishmentData.id,
          punishment: punishmentData
        });
      } else {
        // Create new punishment
        await createPunishmentAsync(punishmentData);
      }
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      // Error handling is now primarily within the mutation hooks
      // Additional specific error handling for UI can be added here if needed
      console.error("Error saving punishment (from component):", error);
      // Toasting is handled by the hooks, but can be overridden or supplemented here
    }
  };
  
  // Handler for deleting a punishment
  const handleDeletePunishment = async (id: string) => {
    try {
      await deletePunishmentAsync(id);
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive"
      });
    }
  };
  
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
  if (!isLoading && punishments.length === 0) {
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
          onDelete={handleDeletePunishment}
        />
      </div>
    );
  }
  
  // Normal render with data
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <div className="flex flex-col space-y-4">
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
        onDelete={handleDeletePunishment} // This still uses deletePunishmentAsync
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
      <PunishmentsContent contentRef={contentRef} />
    </AppLayout>
  );
};

export default Punishments;
