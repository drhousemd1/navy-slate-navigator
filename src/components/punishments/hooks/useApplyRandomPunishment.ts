
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { usePunishmentToast } from './usePunishmentToast';
import { toast } from "@/hooks/use-toast";
import { useCallback } from 'react';

export const useApplyRandomPunishment = (onClose: () => void) => {
  const { applyPunishment } = usePunishments();
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
      await applyPunishment(punishment.id, punishment.points);
      showAppliedToast(punishment.title, punishment.points);
      onClose();
    } catch (error) {
      console.error("Error applying punishment:", error);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    }
  }, [applyPunishment, showAppliedToast, onClose]);
  
  return { handlePunish };
};
