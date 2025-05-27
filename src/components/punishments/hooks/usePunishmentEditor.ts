import { useState } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { 
  useCreatePunishment, 
  useUpdatePunishment, 
  useDeletePunishment,
  type CreatePunishmentVariables,
  type UpdatePunishmentVariables
} from '@/data/punishments/mutations';
import { logger } from '@/lib/logger';

interface UsePunishmentEditorProps {
  id?: string; 
  onSaveSuccess?: (savedData: PunishmentData) => void;
  // Consider adding onDeleteSuccess if needed in the future
}

export const usePunishmentEditor = ({ id, onSaveSuccess }: UsePunishmentEditorProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const createPunishmentMutation = useCreatePunishment();
  const updatePunishmentMutation = useUpdatePunishment();
  const deletePunishmentMutation = useDeletePunishment();
  
  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (dataFromForm: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      let savedPunishment: PunishmentData;
      if (id) {
        if (!dataFromForm.title || typeof dataFromForm.points !== 'number') {
            toast({ title: "Validation Error", description: "Title and points are required.", variant: "destructive" });
            throw new Error("Title and points are required for update.");
        }
        const updateVariables: UpdatePunishmentVariables = {
          id,
          ...dataFromForm,
        };
        savedPunishment = await updatePunishmentMutation.mutateAsync(updateVariables);
      } else {
        if (!dataFromForm.title || typeof dataFromForm.points !== 'number') {
          toast({ title: "Validation Error", description: "Title and points are required to create a punishment.", variant: "destructive" });
          throw new Error("Title and points are required to create a punishment.");
        }
        const createVariables: CreatePunishmentVariables = {
          title: dataFromForm.title,
          points: dataFromForm.points,
          description: dataFromForm.description,
          dom_supply: dataFromForm.dom_supply,
          icon_name: dataFromForm.icon_name,
          icon_color: dataFromForm.icon_color,
          background_image_url: dataFromForm.background_image_url,
          background_opacity: dataFromForm.background_opacity,
          title_color: dataFromForm.title_color,
          subtext_color: dataFromForm.subtext_color,
          calendar_color: dataFromForm.calendar_color,
          highlight_effect: dataFromForm.highlight_effect,
          focal_point_x: dataFromForm.focal_point_x,
          focal_point_y: dataFromForm.focal_point_y,
        };
        savedPunishment = await createPunishmentMutation.mutateAsync(createVariables);
      }
      
      if (onSaveSuccess) {
        onSaveSuccess(savedPunishment);
      }
      return savedPunishment;
    } catch (error) {
      logger.error("Error saving punishment in usePunishmentEditor:", error);
      if (!(error instanceof Error && (error.message.includes("Title and points are required")))) {
        toast({ title: "Error Saving Punishment", description: error instanceof Error ? error.message : "Failed to save punishment.", variant: "destructive" });
      }
      throw error;
    }
  };

  const handleDeletePunishment = async () => {
    if (!id) {
      toast({ title: "Error", description: "No punishment ID specified for delete.", variant: "destructive" });
      return;
    }
    
    try {
      await deletePunishmentMutation.mutateAsync(id);
      setIsEditorOpen(false);
    } catch (error) {
      logger.error("Error deleting punishment in usePunishmentEditor:", error);
      throw error;
    }
  };
  
  return {
    isEditorOpen,
    setIsEditorOpen,
    handleEdit,
    handleSavePunishment, 
    handleDeletePunishment
  };
};
