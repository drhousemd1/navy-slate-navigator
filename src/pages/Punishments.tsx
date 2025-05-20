import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { PunishmentData } from '@/contexts/punishments/types';
import ErrorBoundary from '@/components/ErrorBoundary';
// Removed: import { useSyncManager } from '@/hooks/useSyncManager';
import PunishmentList from '@/components/punishments/PunishmentList';
import { usePunishmentsQuery, PunishmentsQueryResult } from '@/data/punishments/queries';
import { useCreatePunishment, useUpdatePunishment, useDeletePunishment, CreatePunishmentVariables, UpdatePunishmentVariables } from '@/data/punishments/mutations';
import { toast } from '@/hooks/use-toast';

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { 
    data: punishments = [],
    isLoading: isLoadingPunishments,
    error: errorPunishments,
  }: PunishmentsQueryResult = usePunishmentsQuery();
  
  const createPunishmentMutation = useCreatePunishment();
  const updatePunishmentMutation = useUpdatePunishment();
  const deletePunishmentMutation = useDeletePunishment();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  
  // Removed: const { syncNow } = useSyncManager({ intervalMs: 30000, enabled: true });

  // Removed: useEffect for syncNow

  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };
  
  useEffect(() => {
    // Simplified: directly assign handleAddNewPunishment if it's stable
    // Or ensure it's memoized if it changes frequently
    contentRef.current = { handleAddNewPunishment };
    return () => { contentRef.current = {}; };
  }, [contentRef, handleAddNewPunishment]);
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishmentEditor = async (punishmentDataToSave: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      let savedPunishment: PunishmentData;
      if (currentPunishment?.id) {
        // For updates, ensure all required fields from PunishmentData are present or defaulted if needed.
        // The form should provide these.
        const updateVariables: UpdatePunishmentVariables = {
          id: currentPunishment.id,
          ...punishmentDataToSave,
          // Ensure non-nullable fields that might be missing from Partial<PunishmentData> get a default
          // if the form doesn't guarantee them. However, PunishmentFormProvider schema now has defaults.
          description: punishmentDataToSave.description ?? currentPunishment.description ?? '',
          dom_points: punishmentDataToSave.dom_points ?? currentPunishment.dom_points ?? 0,
          dom_supply: punishmentDataToSave.dom_supply ?? currentPunishment.dom_supply ?? 0,
          // other required fields should be handled by form defaults or here if necessary
        };
        savedPunishment = await updatePunishmentMutation.mutateAsync(updateVariables);
        toast({ title: "Success", description: "Punishment updated successfully." });
      } else {
        // For creation, ensure all required fields for CreatePunishmentVariables are present.
        // The Zod schema in PunishmentFormProvider provides defaults for many of these.
        if (!punishmentDataToSave.title || typeof punishmentDataToSave.points !== 'number') {
          toast({ title: "Validation Error", description: "Title and points are required to create a punishment.", variant: "destructive" });
          throw new Error("Title and points are required to create a punishment.");
        }
        const createVariables: CreatePunishmentVariables = {
          title: punishmentDataToSave.title,
          points: punishmentDataToSave.points,
          description: punishmentDataToSave.description ?? '', // Ensured by schema default now
          dom_points: punishmentDataToSave.dom_points ?? Math.ceil(punishmentDataToSave.points / 2), // Default logic if not from form
          dom_supply: punishmentDataToSave.dom_supply ?? 0, // Ensured by schema default
          icon_name: punishmentDataToSave.icon_name,
          icon_color: punishmentDataToSave.icon_color ?? '#ea384c', // Ensured by schema default
          background_image_url: punishmentDataToSave.background_image_url,
          background_opacity: punishmentDataToSave.background_opacity ?? 50, // Ensured by schema default
          title_color: punishmentDataToSave.title_color ?? '#FFFFFF', // Ensured by schema default
          subtext_color: punishmentDataToSave.subtext_color ?? '#8E9196', // Ensured by schema default
          calendar_color: punishmentDataToSave.calendar_color ?? '#ea384c', // Ensured by schema default
          highlight_effect: punishmentDataToSave.highlight_effect ?? false, // Ensured by schema default
          focal_point_x: punishmentDataToSave.focal_point_x ?? 50, // Ensured by schema default
          focal_point_y: punishmentDataToSave.focal_point_y ?? 50, // Ensured by schema default
        };
        savedPunishment = await createPunishmentMutation.mutateAsync(createVariables);
        toast({ title: "Success", description: "Punishment created successfully." });
      }
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
      return savedPunishment;
    } catch (error) {
      console.error("Error saving punishment:", error);
      if (!(error instanceof Error && error.message.includes("Title and points are required"))) {
         toast({
           title: "Error Saving Punishment",
           description: error instanceof Error ? error.message : "An unexpected error occurred.",
           variant: "destructive",
         });
      }
      throw error; 
    }
  };
  
  const handleDeletePunishmentEditor = async (id: string) => {
    try {
      await deletePunishmentMutation.mutateAsync(id);
      toast({ title: "Success", description: "Punishment deleted successfully." });
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({
        title: "Error Deleting Punishment",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <PunishmentList 
        punishments={punishments}
        isLoading={isLoadingPunishments}
        onEditPunishment={handleEditPunishment}
        error={errorPunishments} 
      />
      
      <PunishmentEditor
        isOpen={isEditorOpen}
        onClose={() => {
            setIsEditorOpen(false);
            setCurrentPunishment(undefined);
        }}
        punishmentData={currentPunishment}
        onSave={handleSavePunishmentEditor}
        onDelete={currentPunishment?.id ? () => handleDeletePunishmentEditor(currentPunishment.id) : undefined}
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
