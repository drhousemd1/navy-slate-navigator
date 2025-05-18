import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';

interface UsePunishmentEditorProps {
  id?: string; // This ID is of the punishment being edited
  // Add a callback for when save is successful and form data is available,
  // so the parent can clear persisted state.
  onSaveSuccess?: (savedData: PunishmentData) => void;
}

export const usePunishmentEditor = ({ id, onSaveSuccess }: UsePunishmentEditorProps) => {
  // savePunishment handles both create and update. deletePunishment is specific.
  const { savePunishment, deletePunishment: deletePunishmentFromContext } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  // This function is for saving changes to an *existing* punishment
  const handleSavePunishment = async (updatedData: Partial<PunishmentData>): Promise<PunishmentData> => {
    if (!id) {
        toast({ title: "Error", description: "No punishment ID specified for update.", variant: "destructive" });
        throw new Error("No ID specified for update.");
    }
    
    try {
      const punishmentToSave = { ...updatedData, id };
      // savePunishment from context should ideally return the saved PunishmentData
      const savedPunishment = await savePunishment(punishmentToSave); 
      
      // setIsEditorOpen(false); // Editor remains open
      toast({ title: "Success", description: "Punishment updated." });
      
      if (onSaveSuccess && savedPunishment) {
        onSaveSuccess(savedPunishment);
      }
      
      return savedPunishment; // Return the saved punishment
    } catch (error) {
      console.error("Error updating punishment:", error);
      toast({ title: "Error", description: "Failed to update punishment.", variant: "destructive" });
      throw error; // Re-throw so the form handler knows it failed
    }
  };

  const handleDeletePunishment = async () => {
    if (!id) {
      toast({ title: "Error", description: "No punishment ID specified for delete.", variant: "destructive" });
      return;
    }
    
    try {
      await deletePunishmentFromContext(id);
      setIsEditorOpen(false); // Close editor and potentially navigate or refresh list
      toast({ title: "Success", description: "Punishment deleted." }); // Added toast
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({ title: "Error", description: "Failed to delete punishment.", variant: "destructive" });
    }
  };
  
  return {
    isEditorOpen,
    setIsEditorOpen,
    handleEdit,
    handleSavePunishment, // For updating existing
    handleDeletePunishment
  };
};
