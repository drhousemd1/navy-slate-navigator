
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
// PunishmentCard is now used within PunishmentList
import { Skull } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { usePunishments } from '@/contexts/punishments/PunishmentsProvider';
import { PunishmentData } from '@/contexts/punishments/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
// PunishmentCardSkeleton is not used based on previous refactoring.
import { useSyncManager } from '@/hooks/useSyncManager';
// PUNISHMENTS_QUERY_KEY is not directly used here anymore.
import PunishmentList from '@/components/punishments/PunishmentList'; // Import new component

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
  }, [contentRef]);
  
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
  
  const showInitialLoader = isLoadingPunishments && punishments.length === 0;

  if (showInitialLoader) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="space-y-4 mt-4">
          <p className="text-center text-gray-400">Loading punishments...</p>
        </div>
      </div>
    );
  }
  
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
          description="You currently have no punishments. Please create one to continue."
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
          onSave={handleSavePunishmentEditor}
          onDelete={handleDeletePunishmentEditor}
        />
      </div>
    );
  }
  
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <PunishmentList 
        punishments={punishments}
        onEditPunishment={handleEditPunishment}
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
