import React, { useState, useEffect } from 'react';
import PunishmentEditorForm from './punishments/PunishmentEditorForm';
import { PunishmentData } from '@/contexts/PunishmentsContext';
import { useCreatePunishment } from '@/data/punishments/mutations/useCreatePunishment';
import { useUpdatePunishment } from '@/data/punishments/mutations/useUpdatePunishment';
import { useDeletePunishment } from '@/data/punishments/mutations/useDeletePunishment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { logger } from '@/lib/logger';

interface PunishmentEditorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  punishmentData?: PunishmentData | null; 
  onSaveSuccess?: (savedPunishment: PunishmentData) => void;
  onDeleteSuccess?: (punishmentId: string) => void;
}

const PunishmentEditor: React.FC<PunishmentEditorProps> = ({
  isOpen,
  onOpenChange,
  punishmentData,
  onSaveSuccess,
  onDeleteSuccess,
}) => {
  const createPunishmentMutation = useCreatePunishment();
  const updatePunishmentMutation = useUpdatePunishment();
  const deletePunishmentMutation = useDeletePunishment();

  const [internalPunishmentData, setInternalPunishmentData] = useState<PunishmentData | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      // When modal opens, set internal data. If punishmentData is null/undefined, it's a new punishment.
      setInternalPunishmentData(punishmentData || undefined);
    }
  }, [isOpen, punishmentData]);

  const handleSave = async (data: Partial<PunishmentData>): Promise<PunishmentData> => {
    logger.log('handleSave called with data:', data);
    try {
      let savedPunishment: PunishmentData;
      if (internalPunishmentData?.id) {
        // Update existing punishment
        savedPunishment = await updatePunishmentMutation.mutateAsync({ id: internalPunishmentData.id, ...data });
      } else {
        // Create new punishment, ensure all required fields for creation are present or handled by backend defaults
        const createData = {
          title: data.title || 'Untitled Punishment',
          points: data.points || 0,
          // Provide defaults for other non-nullable fields if not in `data`
          // This matches the useCreateOptimisticMutation structure for Punishment
          description: data.description || null,
          background_image_url: data.background_image_url || null,
          background_opacity: data.background_opacity === undefined ? 100 : data.background_opacity,
          icon_name: data.icon_name || null,
          icon_url: data.icon_url || null,
          icon_color: data.icon_color || '#FFFFFF',
          title_color: data.title_color || '#FFFFFF',
          subtext_color: data.subtext_color || '#CCCCCC',
          highlight_effect: data.highlight_effect === undefined ? false : data.highlight_effect,
          focal_point_x: data.focal_point_x === undefined ? 50 : data.focal_point_x,
          focal_point_y: data.focal_point_y === undefined ? 50 : data.focal_point_y,
          is_sound_enabled: data.is_sound_enabled === undefined ? false : data.is_sound_enabled,
          sound_file_url: data.sound_file_url || null,
          is_permanent: data.is_permanent === undefined ? false : data.is_permanent,
        };
        savedPunishment = await createPunishmentMutation.mutateAsync(createData);
      }
      onSaveSuccess?.(savedPunishment);
      onOpenChange(false); // Close dialog on success
      return savedPunishment;
    } catch (error) {
      logger.error('Error saving punishment:', error);
      // Error toast is handled by optimistic mutation hooks
      throw error; // Re-throw to be caught by the form's submit handler
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePunishmentMutation.mutateAsync(id);
      onDeleteSuccess?.(id);
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      logger.error(`Error deleting punishment ${id}:`, error);
      // Error toast handled by optimistic mutation hook
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Determine if it's an edit or create mode based on internalPunishmentData
  const editorTitle = internalPunishmentData?.id ? "Edit Punishment" : "Create New Punishment";
  const editorDescription = internalPunishmentData?.id 
    ? `Editing "${internalPunishmentData.title}". Make your changes below.`
    : "Configure the details for the new punishment.";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editorTitle}</DialogTitle>
          <DialogDescription>{editorDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar spacing */}
          <PunishmentEditorForm
            punishmentData={internalPunishmentData}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={internalPunishmentData?.id ? handleDelete : undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PunishmentEditor;
