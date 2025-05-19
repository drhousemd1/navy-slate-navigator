import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { Skull, AlertTriangle, LoaderCircle } from 'lucide-react'; // Keep Skull if used by ErrorBoundary, added AlertTriangle
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from './PunishmentEditor';
import { PunishmentData } from '@/contexts/punishments/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useSyncManager } from '@/hooks/useSyncManager';
import PunishmentList from '@/components/punishments/PunishmentList';
import { usePunishmentsQuery, PunishmentsQueryResult } from '@/data/punishments/queries'; // Import PunishmentsQueryResult
import { useCreatePunishment, useUpdatePunishment, useDeletePunishment, CreatePunishmentVariables, UpdatePunishmentVariables } from '@/data/punishments/mutations';
import { toast } from '@/hooks/use-toast'; // Changed to match other import patterns

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { 
    data: punishments = [],
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetch: refetchPunishments,
    isUsingCachedData // Destructure new prop
  }: PunishmentsQueryResult = usePunishmentsQuery(); // Use PunishmentsQueryResult
  
  const createPunishmentMutation = useCreatePunishment();
  const updatePunishmentMutation = useUpdatePunishment();
  const deletePunishmentMutation = useDeletePunishment();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  
  // useSyncManager({ enabled: true }); // Sync manager can be enabled if needed for punishments specifically

  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };
  
  useEffect(() => {
    contentRef.current = { handleAddNewPunishment };
    return () => { contentRef.current = {}; };
  }, [contentRef]); // Removed handleAddNewPunishment from deps as it's stable due to no external deps
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishmentEditor = async (punishmentDataToSave: Partial<PunishmentData>): Promise<PunishmentData | void> => { // Adjusted return type
    try {
      let savedPunishment: PunishmentData;
      if (currentPunishment?.id) {
        const updateVariables: UpdatePunishmentVariables = {
          id: currentPunishment.id,
          ...punishmentDataToSave,
        };
        savedPunishment = await updatePunishmentMutation.mutateAsync(updateVariables);
        toast({ title: "Success", description: "Punishment updated successfully." });
      } else {
        if (!punishmentDataToSave.title || typeof punishmentDataToSave.points !== 'number') {
          toast({ title: "Validation Error", description: "Title and points are required to create a punishment.", variant: "destructive" });
          throw new Error("Title and points are required to create a punishment.");
        }
        const createVariables: CreatePunishmentVariables = {
          title: punishmentDataToSave.title,
          points: punishmentDataToSave.points,
          description: punishmentDataToSave.description,
          dom_supply: punishmentDataToSave.dom_supply ?? 0, 
          icon_name: punishmentDataToSave.icon_name,
          icon_color: punishmentDataToSave.icon_color ?? '#ea384c',
          background_image_url: punishmentDataToSave.background_image_url,
          background_opacity: punishmentDataToSave.background_opacity ?? 50,
          title_color: punishmentDataToSave.title_color ?? '#FFFFFF',
          subtext_color: punishmentDataToSave.subtext_color ?? '#8E9196',
          calendar_color: punishmentDataToSave.calendar_color ?? '#ea384c',
          highlight_effect: punishmentDataToSave.highlight_effect ?? false,
          focal_point_x: punishmentDataToSave.focal_point_x ?? 50,
          focal_point_y: punishmentDataToSave.focal_point_y ?? 50,
        };
        savedPunishment = await createPunishmentMutation.mutateAsync(createVariables);
        toast({ title: "Success", description: "Punishment created successfully." });
      }
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
      return savedPunishment;
    } catch (error) {
      console.error("Error saving punishment:", error);
      // Toast already shown in mutation hooks or here for validation
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
      // refetchPunishments(); // Mutations should handle cache invalidation
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({
        title: "Error Deleting Punishment",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
      throw error; // Re-throw
    }
  };
  
  // Error state specifically for initial load if query fails and no data is cached/displayed
  // This state is now primarily handled by PunishmentList
  
  if (errorPunishments && !isLoadingPunishments && punishments.length === 0) {
    return (
      <div className="p-4 pt-6 text-center">
        <PunishmentsHeader />
        <div className="flex flex-col items-center justify-center mt-8">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Punishments</h3>
          <p className="text-slate-400 mb-6">{errorPunishments.message || "Could not load punishments. Please try again."}</p>
          <Button onClick={() => refetchPunishments()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 pt-6"> {/* Standard page padding */}
      <PunishmentsHeader />
      
      <PunishmentList 
        punishments={punishments}
        isLoading={isLoadingPunishments} 
        onEditPunishment={handleEditPunishment}
        error={errorPunishments}
        isUsingCachedData={isUsingCachedData} // Pass new prop
      />
      
      <PunishmentEditor
        isOpen={isEditorOpen}
        onClose={() => {
            setIsEditorOpen(false);
            setCurrentPunishment(undefined);
        }}
        punishmentData={currentPunishment}
        onSave={handleSavePunishmentEditor}
        onDelete={currentPunishment?.id ? () => handleDeletePunishmentEditor(currentPunishment!.id) : undefined}
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
