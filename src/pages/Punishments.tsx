import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { usePunishments } from '@/contexts/punishments/PunishmentsProvider';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
import { useCreatePunishment, CreatePunishmentVariables } from '@/data/punishments/mutations/useCreatePunishment';
import { useUpdatePunishment, UpdatePunishmentVariables } from '@/data/punishments/mutations/useUpdatePunishment';
import PunishmentCardSkeleton from '@/components/punishments/PunishmentCardSkeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  // Use the hook from context provider
  const { 
    punishments, // This now comes from the standardized usePunishmentsData via context
    isLoading: isLoadingPunishments, // Renamed from isLoading to avoid conflict if other loading states are added
    error: errorPunishments, // Renamed from error
    refetchPunishments 
  } = usePunishments();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { mutateAsync: deletePunishmentAsync } = useDeletePunishment();
  const { mutateAsync: createPunishmentAsync } = useCreatePunishment();
  const { mutateAsync: updatePunishmentAsync } = useUpdatePunishment();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 200); // Short delay to allow initial cached data to render if available
    return () => clearTimeout(timer);
  }, []);
  
  // Use isLoadingPunishments from the context hook
  const showLoader = isInitialLoad && isLoadingPunishments && punishments.length === 0;
  
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
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({
        title: "Error on Page",
        description: "Failed to delete punishment from page.",
        variant: "destructive"
      });
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
  
  // Use errorPunishments from the context hook
  if (!isLoadingPunishments && errorPunishments && punishments.length === 0) {
    return (
      <div className="p-4 pt-6 text-center">
        <PunishmentsHeader />
        <EmptyState
          icon={Skull}
          title="Error Loading Punishments"
          description={errorPunishments.message || "Could not load punishments. Please try again later."}
          action={
            <Button onClick={() => refetchPunishments()} className="mt-4">
              Try Again
            </Button>
          }
        />
      </div>
    );
  }
  
  if (!isLoadingPunishments && punishments.length === 0 && !isEditorOpen) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <EmptyState
          icon={Skull}
          title="No Punishments Yet"
          description="Create your first punishment to get started."
          action={
            <Button 
              onClick={handleAddNewPunishment} 
              className="mt-4"
            >
              Create Punishment
            </Button>
          }
        />
        
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
        onDelete={handleDeletePunishment}
      />
    </div>
  );
};

const Punishments: React.FC = () => {
  const contentRef = useRef<{ handleAddNewPunishment?: () => void }>({});
  
  const handleAddNewPunishmentLayout = () => {
    if (contentRef.current.handleAddNewPunishment) {
      contentRef.current.handleAddNewPunishment();
    }
  };
  
  return (
    <AppLayout onAddNewItem={handleAddNewPunishmentLayout}>
      <ErrorBoundary fallbackMessage="Could not load punishments. Please try reloading.">
        <PunishmentsContent contentRef={contentRef} />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Punishments;
