
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { Skull } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { usePunishments } from '@/contexts/punishments/PunishmentsProvider';
import { PunishmentData } from '@/contexts/punishments/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { useSyncManager } from '@/hooks/useSyncManager';
import PunishmentList from '@/components/punishments/PunishmentList';

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { 
    punishments,
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetchPunishments,
    savePunishment,
    deletePunishment
  } = usePunishments();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  
  useSyncManager({ enabled: true });

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
  }, [contentRef]); // Added contentRef to dependency array
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishmentEditor = async (punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    const saved = await savePunishment(punishmentData);
    setIsEditorOpen(false);
    setCurrentPunishment(undefined);
    return saved;
  };
  
  const handleDeletePunishmentEditor = async (id: string) => {
    await deletePunishment(id);
    setIsEditorOpen(false);
    setCurrentPunishment(undefined);
  };
  
  // Handle initial load error state separately
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
  
  // The PunishmentList will now handle its own loading and empty states.
  // The editor is rendered regardless of the list's state if isEditorOpen is true.
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <PunishmentList 
        punishments={punishments}
        // Pass true for isLoading if we are loading AND there are no punishments yet displayed (empty cache)
        isLoading={isLoadingPunishments && punishments.length === 0}
        onEditPunishment={handleEditPunishment}
        onCreatePunishmentClick={handleAddNewPunishment}
      />
      
      <PunishmentEditor
        isOpen={isEditorOpen}
        onClose={() => {
            setIsEditorOpen(false);
            setCurrentPunishment(undefined);
        }}
        punishmentData={currentPunishment}
        onSave={handleSavePunishmentEditor}
        onDelete={handleDeletePunishmentEditor}
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
