import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { usePunishments } from '@/data/queries/usePunishments';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { usePreloadPunishments } from "@/data/preload/usePreloadPunishments";
import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
import { useCreatePunishment, CreatePunishmentVariables } from '@/data/punishments/mutations/useCreatePunishment';
import { useUpdatePunishment, UpdatePunishmentVariables } from '@/data/punishments/mutations/useUpdatePunishment';
import PunishmentCardSkeleton from '@/components/punishments/PunishmentCardSkeleton';
import ErrorBoundary from '@/components/ErrorBoundary';

usePreloadPunishments()();

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { punishments, isLoading, error } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { mutateAsync: deletePunishmentAsync } = useDeletePunishment();
  const { mutateAsync: createPunishmentAsync } = useCreatePunishment();
  const { mutateAsync: updatePunishmentAsync } = useUpdatePunishment();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  
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
  }, [contentRef, handleAddNewPunishment]);
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishment = async (punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      if (punishmentData.id) {
        const { id, ...updates } = punishmentData;
        const updatedPunishment = await updatePunishmentAsync({ id, ...updates });
        setIsEditorOpen(false);
        setCurrentPunishment(undefined);
        return updatedPunishment as PunishmentData;
      } else {
        const { id, created_at, updated_at, ...creatableData } = punishmentData;
        const variables: CreatePunishmentVariables = {
          title: creatableData.title || 'Default Title', 
          points: creatableData.points || 0, 
          dom_supply: creatableData.dom_supply ?? 0, 
          ...creatableData,
        };
        const createdPunishment = await createPunishmentAsync(variables);
        setIsEditorOpen(false);
        setCurrentPunishment(undefined);
        return createdPunishment as PunishmentData;
      }
    } catch (error) {
      console.error("Error saving punishment (from page component):", error);
      throw error;
    }
  };
  
  const handleDeletePunishment = async (id: string) => {
    try {
      await deletePunishmentAsync(id);
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
      toast({
        title: "Error on Page",
        description: "Failed to delete punishment from page.",
        variant: "destructive"
      });
    } catch (error) {
      console.error("Error deleting punishment:", error);
    }
  };
  
  if (showLoader) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="space-y-4 mt-4">
          <PunishmentCardSkeleton />
          <PunishmentCardSkeleton />
          <PunishmentCardSkeleton />
        </div>
      </div>
    );
  }
  
  if (!isLoading && error) { // Handle error state
    return (
      <div className="p-4 pt-6 text-center text-red-500">
        <PunishmentsHeader />
        <p className="mt-4">Error loading punishments: {error.message}</p>
      </div>
    );
  }
  
  if (!isLoading && punishments.length === 0 && !isEditorOpen) { // Added !isEditorOpen to prevent flash of empty state
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
  
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <div className="flex flex-col space-y-4 mt-4">
        {punishments.map((punishment) => (
          <PunishmentCard
            key={punishment.id} // id should be guaranteed if data is loaded
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
        onDelete={handleDeletePunishment}
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
      <ErrorBoundary fallbackMessage="Could not load punishments. Please try reloading.">
        <PunishmentsContent contentRef={contentRef} />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Punishments;
