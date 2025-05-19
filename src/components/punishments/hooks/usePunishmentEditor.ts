
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
      if (id) { // If an id is provided to the hook, it's an update operation
        if (!dataFromForm.title || typeof dataFromForm.points !== 'number') {
            toast({ title: "Validation Error", description: "Title and points are required.", variant: "destructive" });
            throw new Error("Title and points are required for update.");
        }
        const updateVariables: UpdatePunishmentVariables = {
          id,
          ...dataFromForm,
        };
        savedPunishment = await updatePunishmentMutation.mutateAsync(updateVariables);
        // Toast for update success is handled by the mutation hook's onSuccess typically,
        // but can be added here if specific context is needed.
        // For optimistic updates, the mutation hook handles toasts.
        // toast({ title: "Success", description: "Punishment updated." });
      } else { // No id means it's a create operation
        if (!dataFromForm.title || typeof dataFromForm.points !== 'number') {
          toast({ title: "Validation Error", description: "Title and points are required to create a punishment.", variant: "destructive" });
          throw new Error("Title and points are required to create a punishment.");
        }
        // Ensure all required fields for CreatePunishmentVariables are present or handled
        const createVariables: CreatePunishmentVariables = {
          title: dataFromForm.title,
          points: dataFromForm.points,
          description: dataFromForm.description,
          dom_supply: dataFromForm.dom_supply, // Default handled by mutation if undefined
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
        // toast({ title: "Success", description: "Punishment created." });
      }
      
      if (onSaveSuccess) { 
        onSaveSuccess(savedPunishment);
      }
      
      // Editor open/close state is managed by the component using this hook,
      // or internally if this hook is the sole controller.
      // setIsEditorOpen(false); // Typically done by the caller after save, or if it's a "create and close" flow
      return savedPunishment;
    } catch (error) {
      console.error("Error saving punishment in usePunishmentEditor:", error);
      // Avoid double-toasting if validation error already toasted
      if (!(error instanceof Error && (error.message.includes("Title and points are required")))) {
        toast({ title: "Error Saving Punishment", description: error instanceof Error ? error.message : "Failed to save punishment.", variant: "destructive" });
      }
      throw error; // Re-throw so the caller knows it failed
    }
  };

  const handleDeletePunishment = async () => {
    if (!id) { // id from hook props
      toast({ title: "Error", description: "No punishment ID specified for delete.", variant: "destructive" });
      // Optionally throw new Error("No ID specified for delete.");
      return;
    }
    
    try {
      await deletePunishmentMutation.mutateAsync(id);
      setIsEditorOpen(false); // Close the editor managed by this hook instance on successful delete
      // Toast for delete success is handled by the mutation hook.
      // toast({ title: "Success", description: "Punishment deleted." }); 
    } catch (error) {
      console.error("Error deleting punishment in usePunishmentEditor:", error);
      // Toast for delete error is handled by the mutation hook.
      // toast({ title: "Error Deleting Punishment", description: "Failed to delete punishment.", variant: "destructive" });
      throw error; // Re-throw
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

