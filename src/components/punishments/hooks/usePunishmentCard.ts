import { useState } from 'react';
// import { usePunishments } from '@/contexts/PunishmentsContext'; // No longer used for save/delete - REMOVED
import { usePunishmentApply } from './usePunishmentApply';
import { PunishmentData } from '@/contexts/punishments/types'; 
import { toast } from '@/hooks/use-toast';
import { useUpdatePunishment, useDeletePunishment } from '@/data/punishments/mutations';
import { useQueryClient } from '@tanstack/react-query';
// PUNISHMENTS_QUERY_KEY import was not used and can be removed if not added back. For now, keeping other imports.
// import { PUNISHMENTS_QUERY_KEY } from '@/data/punishments/queries'; 
import { logger } from '@/lib/logger';

interface UsePunishmentCardProps {
  punishment: PunishmentData; 
}

export const usePunishmentCard = ({ punishment }: UsePunishmentCardProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { handlePunish } = usePunishmentApply({ punishment }); 

  const queryClient = useQueryClient();
  const updatePunishmentMutation = useUpdatePunishment();
  const deletePunishmentMutation = useDeletePunishment();
  
  const weekData = punishment?.usage_data || []; 
  const frequencyCount = punishment?.frequency_count || 1;

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (data: Partial<Omit<PunishmentData, 'id'>>): Promise<PunishmentData> => { 
    if (!punishment.id) {
       logger.error("usePunishmentCard: Punishment ID is missing for update.");
       toast({ title: "Error", description: "Punishment ID is missing.", variant: "destructive" });
       throw new Error("Punishment ID is missing for update.");
    }
    try {
      const variables = { id: punishment.id, ...data };
      const saved = await updatePunishmentMutation.mutateAsync(variables);
      toast({
        title: "Success",
        description: "Punishment updated successfully"
      });
      setIsEditorOpen(false); 
      return saved;
    } catch (error) {
      logger.error("Error saving punishment from card hook:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save punishment",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDeletePunishment = async () => { 
    if (!punishment.id) {
      toast({ title: "Error", description: "Punishment ID is missing.", variant: "destructive" });
      return;
    }
    try {
      await deletePunishmentMutation.mutateAsync(punishment.id);
      toast({
        title: "Success",
        description: "Punishment deleted successfully"
      });
      setIsEditorOpen(false); 
    } catch (error) {
      logger.error("Error deleting punishment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete punishment",
        variant: "destructive"
      });
      throw error; // Re-throw so UI can react if needed
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
