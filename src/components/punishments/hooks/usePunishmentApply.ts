
import { useState } from 'react';
import { usePunishmentToast } from './usePunishmentToast';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { usePunishmentsQuery } from '@/hooks/usePunishmentsQuery';

interface UsePunishmentApplyProps {
  id?: string;
  points: number;
}

export const usePunishmentApply = ({ id, points }: UsePunishmentApplyProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const toast = usePunishmentToast();
  const { applyPunishment } = usePunishmentsQuery();

  const handlePunish = async () => {
    if (!id || isApplying) return;
    
    setIsApplying(true);
    try {
      await applyPunishment(id, points);
      // Success toast is handled in the mutation
    } catch (error) {
      console.error("Error applying punishment:", error);
      toast.showErrorToast("Failed to apply punishment. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  return {
    handlePunish,
    isApplying
  };
};
