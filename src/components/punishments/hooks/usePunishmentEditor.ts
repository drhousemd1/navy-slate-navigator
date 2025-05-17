
import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext'; // Corrected: This should be from the new provider path
import { PunishmentData } from '@/contexts/punishments/types'; // Corrected: This should be from the new provider path

interface UsePunishmentEditorProps {
  id?: string; // This ID is of the punishment being edited
}

export const usePunishmentEditor = ({ id }: UsePunishmentEditorProps) => {
  // savePunishment handles both create and update. deletePunishment is specific.
  const { savePunishment, deletePunishment: deletePunishmentFromContext } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  // This function is for saving changes to an *existing* punishment
  const handleSavePunishment = async (updatedData: Partial<PunishmentData>) => {
    if (!id) {
        toast({ title: "Error", description: "No punishment ID specified for update.", variant: "destructive" });
        return Promise.reject(new Error("No ID specified for update."));
    }
    
    try {
      // Ensure the ID is part of the data being saved
      await savePunishment({ ...updatedData, id });
      setIsEditorOpen(false); // Close editor on successful save
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating punishment:", error);
      toast({ title: "Error", description: "Failed to update punishment.", variant: "destructive" });
      return Promise.reject(error);
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
