
import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';

interface UsePunishmentEditorProps {
  id?: string; 
  onSaveSuccess?: (savedData: PunishmentData) => void;
}

export const usePunishmentEditor = ({ id, onSaveSuccess }: UsePunishmentEditorProps) => {
  const { savePunishment, deletePunishment: deletePunishmentFromContext } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (updatedData: Partial<PunishmentData>): Promise<PunishmentData> => {
    // id from props is for an existing punishment being edited by this hook instance.
    // updatedData.id might be present if the form is for creation and ID is generated client-side (unlikely here)
    // or if the form directly manipulates an ID field (also unlikely for this hook's purpose).
    // The hook is initialized with an optional `id`, implying it's for editing an existing entity.
    const currentId = updatedData.id || id; 
    
    if (!currentId) {
        toast({ title: "Error", description: "No punishment ID specified for update.", variant: "destructive" });
        throw new Error("No ID specified for update.");
    }
    
    try {
      // Ensure the ID is part of the data sent to savePunishment
      const punishmentToSave = { ...updatedData, id: currentId };
      const savedPunishment = await savePunishment(punishmentToSave); // Now returns PunishmentData
      
      // Editor remains open as per previous requirement
      toast({ title: "Success", description: "Punishment updated." });
      
      if (onSaveSuccess) { 
        onSaveSuccess(savedPunishment); // savedPunishment is now PunishmentData
      }
      
      return savedPunishment; // Return the saved punishment (which is PunishmentData)
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
      setIsEditorOpen(false); 
      toast({ title: "Success", description: "Punishment deleted." }); 
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({ title: "Error", description: "Failed to delete punishment.", variant: "destructive" });
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
