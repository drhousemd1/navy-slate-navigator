import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { PunishmentData } from '@/contexts/punishments/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import PunishmentList from '@/components/punishments/PunishmentList';
import { usePunishmentsQuery, PunishmentsQueryResult } from '@/data/punishments/queries';
import { useCreatePunishment, useUpdatePunishment, useDeletePunishment, CreatePunishmentVariables, UpdatePunishmentVariables } from '@/data/punishments/mutations';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/contexts/auth';
import { checkAndPerformPunishmentsResets } from '@/lib/punishmentsUtils';
import { useQueryClient } from '@tanstack/react-query';
import { loadPunishmentsFromDB } from '@/data/indexedDB/useIndexedDB';
import { PUNISHMENTS_QUERY_KEY } from '@/data/punishments/queries';

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { 
    data: punishments = [],
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetch
  }: PunishmentsQueryResult = usePunishmentsQuery();
  
  const createPunishmentMutation = useCreatePunishment();
  const updatePunishmentMutation = useUpdatePunishment();
  const deletePunishmentMutation = useDeletePunishment();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);

  // Check for punishments resets on page load when user is available
  useEffect(() => {
    const checkAndReloadPunishments = async () => {
      try {
        logger.debug('[Punishments] Checking for punishments resets');
        
        const resetPerformed = await checkAndPerformPunishmentsResets();
        
        if (resetPerformed) {
          logger.debug('[Punishments] Resets performed, invalidating cache and reloading fresh data');
          
          // Force complete cache invalidation for punishments
          await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
          
          // Reload fresh data from IndexedDB after resets
          const freshData = await loadPunishmentsFromDB();
          
          if (freshData && Array.isArray(freshData)) {
            // Update React Query cache with fresh data
            queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, freshData);
            logger.debug('[Punishments] Updated cache with fresh reset data');
          }
          
          // Force a refetch to ensure we have the latest data from server
          await refetch();
        }
      } catch (error) {
        logger.error('[Punishments] Error during reset check:', error);
      }
    };

    if (user) {
      checkAndReloadPunishments();
    }
  }, [user, queryClient, refetch]);

  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };
  
  useEffect(() => {
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
    } catch (error: unknown) {
      logger.error("Error saving punishment:", error);
      const errorMessage = getErrorMessage(error);
      if (!errorMessage.includes("Title and points are required to create a punishment.")) {
         toast({
           title: "Error Saving Punishment",
           description: errorMessage,
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
    } catch (error: unknown) {
      logger.error("Error deleting punishment:", error);
      toast({
        title: "Error Deleting Punishment",
        description: getErrorMessage(error),
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
