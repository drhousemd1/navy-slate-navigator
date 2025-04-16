
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { usePunishmentToast } from './usePunishmentToast';
import { toast } from "@/hooks/use-toast";
import { useCallback } from 'react';

export const useApplyRandomPunishment = (onClose: () => void) => {
  const { applyPunishment, fetchPunishmentById } = usePunishments();
  const { showAppliedToast } = usePunishmentToast();
  
  const handlePunish = useCallback(async (punishment: PunishmentData | null) => {
    if (!punishment || !punishment.id) {
      toast({
        title: "Error",
        description: "Cannot apply punishment. Please select a valid punishment.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Make sure we have the latest data by fetching the punishment directly
      const latestPunishment = await fetchPunishmentById(punishment.id);
      const pointsToDeduct = latestPunishment?.points || punishment.points;
      
      await applyPunishment(punishment.id, pointsToDeduct);
      showAppliedToast(punishment.title, pointsToDeduct);
      onClose();
    } catch (error) {
      console.error("Error applying punishment:", error);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    }
  }, [applyPunishment, fetchPunishmentById, showAppliedToast, onClose]);
  
  return { handlePunish };
};
