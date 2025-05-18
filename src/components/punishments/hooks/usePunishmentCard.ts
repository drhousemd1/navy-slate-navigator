
import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext'; 
import { usePunishmentApply } from './usePunishmentApply';
import { PunishmentData } from '@/contexts/punishments/types'; 
import { toast } from '@/hooks/use-toast';

interface UsePunishmentCardProps {
  punishment: PunishmentData; 
}

export const usePunishmentCard = ({ punishment }: UsePunishmentCardProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { handlePunish } = usePunishmentApply({ punishment }); 
  const { savePunishment, deletePunishment: deletePunishmentFromContext } = usePunishments();
  
  const weekData = punishment?.usage_data || [];
  const frequencyCount = punishment?.frequency_count || 1;

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (data: Partial<PunishmentData>): Promise<PunishmentData> => { 
    try {
      // The punishment object from props (UsePunishmentCardProps) always has an ID if it's an existing card.
      // Data passed in might be partial updates.
      if (!punishment.id && !data.id) {
         console.error("usePunishmentCard: Punishment ID is missing for update.");
         toast({ title: "Error", description: "Punishment ID is missing.", variant: "destructive" });
         throw new Error("Punishment ID is missing for update.");
      }
      // Ensure the ID of the current punishment card is used if not overridden by incoming data
      const dataToSave = { ...data, id: data.id || punishment.id }; 
      const saved = await savePunishment(dataToSave); // savePunishment from context now returns PunishmentData
      toast({
        title: "Success",
        description: "Punishment updated successfully"
      });
      setIsEditorOpen(false); 
      return saved; // Return the saved data
    } catch (error) {
      console.error("Error saving punishment from card hook:", error);
      toast({
        title: "Error",
        description: "Failed to save punishment",
        variant: "destructive"
      });
      throw error; // Re-throw to allow higher-level error handling
    }
  };

  const handleDeletePunishment = async () => { 
    if (!punishment.id) {
      toast({ title: "Error", description: "Punishment ID is missing.", variant: "destructive" });
      return;
    }
    try {
      await deletePunishmentFromContext(punishment.id);
      toast({
        title: "Success",
        description: "Punishment deleted successfully"
      });
      setIsEditorOpen(false); 
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive"
      });
    }
  };

  return {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    frequencyCount,
    punishment, 
    handlePunish,
    handleEdit,
    handleSavePunishment,
    handleDeletePunishment
  };
};
