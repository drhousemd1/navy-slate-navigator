
import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull, Loader2 } from 'lucide-react'; // Added Loader2
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { usePunishments } from '@/contexts/punishments/PunishmentsProvider';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
// Mutations are now primarily handled by the context, direct use here might be redundant
// or should be reviewed if specific onSuccess/onError logic is needed at page level.
// For now, we rely on context for mutations.
// import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
// import { useCreatePunishment, CreatePunishmentVariables } from '@/data/punishments/mutations/useCreatePunishment';
// import { useUpdatePunishment, UpdatePunishmentVariables } from '@/data/punishments/mutations/useUpdatePunishment';
import ErrorBoundary from '@/components/ErrorBoundary';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { 
    punishments,
    isLoading: isLoadingPunishments, // Now comes from context correctly
    error: errorPunishments,
    refetchPunishments,
    savePunishment, // Use from context
    deletePunishment // Use from context
  } = usePunishments();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  // Removed isInitialLoad, isLoadingPunishments from context is sufficient
  
  // const { mutateAsync: deletePunishmentAsync } = useDeletePunishment(); // Handled by context
  // const { mutateAsync: createPunishmentAsync } = useCreatePunishment(); // Handled by context
  // const { mutateAsync: updatePunishmentAsync } = useUpdatePunishment(); // Handled by context
  
  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };
  
  useEffect(() => {
    contentRef.current = { handleAddNewPunishment };
    return () => { contentRef.current = {}; };
  }, [contentRef, handleAddNewPunishment]); // handleAddNewPunishment dependency
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishmentEditor = async (punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      const saved = await savePunishment(punishmentData); // Use context's savePunishment
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
      return saved; // savePunishment now returns PunishmentData
    } catch (error) {
      console.error("Error saving punishment (from page component):", error);
      // Error toast should be handled by the mutation hook's onError or within savePunishment
      throw error; // Re-throw to ensure Promise<PunishmentData> or rejection
    }
  };
  
  const handleDeletePunishmentEditor = async (id: string) => {
    try {
      await deletePunishment(id); // Use context's deletePunishment
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      console.error("Error deleting punishment:", error);
      // Error toast handled by context or mutation hook
    }
  };
  
  // Render flow as per instructions
  if (isLoadingPunishments && (!punishments || punishments.length === 0)) {
    // Show spinning loading icon in the app header is handled by AppLayout SyncStatusIndicator
    // For page content, we can show a simple loader here or rely on header.
    // Based on instructions, if isLoading && !data, show loader in header.
    // Page should not show skeletons or specific UI *during loading if no cached data*.
    // This state means loading and no cached data yet.
    return (
      <div className="p-4 pt-6 text-center">
        <PunishmentsHeader />
        {/* Loader icon could be placed in PunishmentsHeader or here */}
        {/* Minimal content during this phase as per instructions */}
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
  
  if (!isLoadingPunishments && punishments.length === 0) {
    // This covers the "empty state" after loading.
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="text-white text-center mt-8">
          <p>You currently have no punishments.</p>
          <p>Please create one to continue.</p>
        </div>
        
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
  
  // Render data cards
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
        {/* PunishmentsProvider is now higher up, likely in App.tsx or a route wrapper.
            If it's not, it needs to be wrapped here. Assuming it's provided globally for this page.
            If PunishmentsProvider was specific to this page, it should wrap PunishmentsContent.
            Based on previous structure, it was likely around AppRoutes or similar.
            For this refactor, we assume PunishmentsProvider is correctly placed.
        */}
        <PunishmentsContent contentRef={contentRef} />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Punishments;

