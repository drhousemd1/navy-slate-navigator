
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { PunishmentData } from '@/contexts/punishments/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import PunishmentList from '@/components/punishments/PunishmentList';
import { usePunishmentsQuery, PunishmentsQueryResult } from '@/data/punishments/queries';
import { useCreatePunishment, useUpdatePunishment, useDeletePunishment, CreatePunishmentVariables, UpdatePunishmentVariables } from '@/data/punishments/mutations';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

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
        const updateVariables: UpdatePunishmentVariables = {
          id: currentPunishment.id,
          ...punishmentDataToSave,
          description: punishmentDataToSave.description ?? currentPunishment.description ?? '',
          dom_points: punishmentDataToSave.dom_points ?? currentPunishment.dom_points ?? 0,
          dom_supply: punishmentDataToSave.dom_supply ?? currentPunishment.dom_supply ?? 0,
        };
        savedPunishment = await updatePunishmentMutation.mutateAsync(updateVariables);
      } else {
        if (!punishmentDataToSave.title || typeof punishmentDataToSave.points !== 'number') {
          throw new Error("Title and points are required to create a punishment.");
        }
        const createVariables: CreatePunishmentVariables = {
          title: punishmentDataToSave.title,
          points: punishmentDataToSave.points,
          description: punishmentDataToSave.description ?? '',
          dom_points: punishmentDataToSave.dom_points ?? Math.ceil(punishmentDataToSave.points / 2),
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
      }
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
      return savedPunishment;
    } catch (error: unknown) {
      logger.error("Error saving punishment:", error);
      throw error; 
    }
  };
  
  const handleDeletePunishmentEditor = async (id: string) => {
    try {
      await deletePunishmentMutation.mutateAsync(id);
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error: unknown) {
      logger.error("Error deleting punishment:", error);
      throw error;
    }
  };
  
  return (
    <div className="p-4 pt-6 max-w-4xl mx-auto">
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
