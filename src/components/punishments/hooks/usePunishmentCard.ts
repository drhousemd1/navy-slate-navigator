
import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { usePunishmentApply } from './usePunishmentApply';
import { PunishmentData } from '@/contexts/PunishmentsContext';
import { toast } from '@/hooks/use-toast';

interface UsePunishmentCardProps {
  id?: string;
  points: number;
  dom_points?: number;
}

export const usePunishmentCard = ({ id, points, dom_points }: UsePunishmentCardProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { handlePunish } = usePunishmentApply({ id, points, dom_points });
  const { punishments, updatePunishment, deletePunishment } = usePunishments();
  
  // Find the punishment data for the current card
  const punishment = id ? punishments.find(p => p.id === id) : undefined;
  
  // Get usage data for the punishment
  const weekData = punishment?.usage_data || [];
  const frequencyCount = punishment?.frequency_count || 1;

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (data: PunishmentData) => {
    try {
      if (data.id && id) {
        await updatePunishment(data.id, data);
        toast({
          title: "Success",
          description: "Punishment updated successfully"
        });
      }
    } catch (error) {
      console.error("Error saving punishment:", error);
      toast({
        title: "Error",
        description: "Failed to update punishment",
        variant: "destructive"
      });
    }
  };

  const handleDeletePunishment = async (punishmentId: string) => {
    try {
      await deletePunishment(punishmentId);
      toast({
        title: "Success",
        description: "Punishment deleted successfully"
      });
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
    punishment, // Now returning the full punishment data from context
    handlePunish,
    handleEdit,
    handleSavePunishment,
    handleDeletePunishment
  };
};
