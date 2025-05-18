
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
    if (!id) {
        toast({ title: "Error", description: "No punishment ID specified for update.", variant: "destructive" });
        throw new Error("No ID specified for update.");
    }
    
    try {
      const punishmentToSave = { ...updatedData, id };
      // savePunishment from context is typed to return Promise<PunishmentData>
      const savedPunishment = await savePunishment(punishmentToSave); 
      
      // Editor remains open as per previous requirement
      toast({ title: "Success", description: "Punishment updated." });
      
      if (onSaveSuccess) { // savedPunishment is of type PunishmentData, so it's truthy if successful
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
