
import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext'; // Corrected: This should be from the new provider path
import { usePunishmentApply } from './usePunishmentApply';
import { PunishmentData } from '@/contexts/punishments/types'; // Corrected: This should be from the new provider path
import { toast } from '@/hooks/use-toast';

interface UsePunishmentCardProps {
  punishment: PunishmentData; // Changed to accept full punishment object
}

export const usePunishmentCard = ({ punishment }: UsePunishmentCardProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  // Pass the full punishment object to usePunishmentApply
  const { handlePunish } = usePunishmentApply({ punishment }); 
  const { savePunishment, deletePunishment: deletePunishmentFromContext } = usePunishments();
  
  const weekData = punishment?.usage_data || [];
  // frequency_count should now be available on punishment if PunishmentData type is correct
  const frequencyCount = punishment?.frequency_count || 1;

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (data: Partial<PunishmentData>) => { // Data should be Partial for updates
    try {
      if (punishment.id) { // Check current punishment's ID for existing record
        // Merge with existing ID if not present in partial data
        const dataToSave = { ...data, id: punishment.id };
        await savePunishment(dataToSave);
        toast({
          title: "Success",
          description: "Punishment updated successfully"
        });
        setIsEditorOpen(false); // Close editor on successful save
      } else {
        // This case should ideally be handled by a "create" flow,
        // but if savePunishment can create, it would be:
        // await savePunishment(data);
        // toast({ title: "Success", description: "Punishment created successfully" });
        console.warn("usePunishmentCard's handleSavePunishment called without an existing punishment ID.");
      }
    } catch (error) {
      console.error("Error saving punishment:", error);
      toast({
        title: "Error",
        description: "Failed to save punishment",
        variant: "destructive"
      });
    }
  };

  const handleDeletePunishment = async () => { // Takes no argument, uses punishment.id from props
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
      setIsEditorOpen(false); // Close editor on successful delete
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
