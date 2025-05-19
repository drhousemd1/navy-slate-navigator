
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { usePunishments } from '@/contexts/punishments/PunishmentsProvider';
import { PunishmentData } from '@/contexts/punishments/types'; // Keep this for type consistency
import ErrorBoundary from '@/components/ErrorBoundary';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import PunishmentCardSkeleton from '@/components/punishments/PunishmentCardSkeleton'; // Keep for loading state if desired, though prompt wants immediate render
import { useSyncManager } from '@/hooks/useSyncManager'; // Import useSyncManager
import { PUNISHMENTS_QUERY_KEY } from '@/data/punishments/queries'; // Import query key


const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { 
    punishments,
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetchPunishments,
    savePunishment, // from context
    deletePunishment // from context
  } = usePunishments();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  // No need for isInitialLoad if we rely on isLoadingPunishments from the hook for the very first load
  
  // useSyncManager({ includeKeys: [PUNISHMENTS_QUERY_KEY] }); // Sync only punishments data for this page
  // Simpler: if PUNISHMENTS_QUERY_KEY is in CRITICAL_QUERY_KEYS, this will sync it by default.
  // CRITICAL_QUERY_KEYS.PUNISHMENTS is ['punishments']
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
  }, [contentRef]); // Removed handleAddNewPunishment from deps as it's stable due to useCallback in usePunishmentsData
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  // onSave for PunishmentEditor, matches (data: Partial<PunishmentData>) => Promise<PunishmentData>
  const handleSavePunishmentEditor = async (punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    // The savePunishment from context now aligns with the expected signature after changes in usePunishmentsData and provider
    const saved = await savePunishment(punishmentData);
    setIsEditorOpen(false);
    setCurrentPunishment(undefined);
    return saved; // savePunishment from context now returns PunishmentData
  };
  
  const handleDeletePunishmentEditor = async (id: string) => {
    await deletePunishment(id);
    setIsEditorOpen(false);
    setCurrentPunishment(undefined);
  };
  
  // Show loader only if truly loading for the first time and punishments array is empty
  const showInitialLoader = isLoadingPunishments && punishments.length === 0;

  if (showInitialLoader) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="space-y-4 mt-4">
          {/* Per instructions, skeletons should be removed if data renders immediately from cache. */}
          {/* If cache is empty, it should go to EmptyState. If loading from network first time, a simple text indicator is better. */}
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
  
  // Immediate render from cache: if not loading, and punishments array is empty
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
          isOpen={isEditorOpen} // This would be false here, so editor won't show based on this block
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
    // PunishmentsProvider should be higher up if AppLayout or other siblings need it.
    // Assuming PunishmentsProvider is already in AppProviders.tsx or similar.
    // If not, it should wrap PunishmentsContent. For now, let's assume it's provided globally.
    <AppLayout onAddNewItem={handleAddNewPunishmentLayout}>
      <ErrorBoundary fallbackMessage="Could not load punishments. Please try reloading.">
        {/* PunishmentsProvider is removed from here, assuming it's in AppProviders or similar higher component */}
        <PunishmentsContent contentRef={contentRef} />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Punishments;
