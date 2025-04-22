
import { useState, useCallback } from 'react';
import { usePunishments, PunishmentData } from '@/contexts/PunishmentsContext';

interface UsePunishmentEditorProps {
  id?: string;
}

export const usePunishmentEditor = ({ id }: UsePunishmentEditorProps) => {
  const { updatePunishment, deletePunishment } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handleEdit = useCallback(() => {
    console.log("Edit button clicked for punishment ID:", id);
    setIsEditorOpen(true);
  }, [id]);

  const handleSavePunishment = async (updatedPunishment: PunishmentData) => {
    if (!id) return Promise.resolve();
    
    try {
      await updatePunishment(id, updatedPunishment);
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating punishment:", error);
      return Promise.reject(error);
    }
  };

  const handleDeletePunishment = async () => {
    if (!id) return;
    
    try {
      await deletePunishment(id);
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error deleting punishment:", error);
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
