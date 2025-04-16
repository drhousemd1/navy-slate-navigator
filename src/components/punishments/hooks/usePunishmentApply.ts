
import { useState } from 'react';
import { usePunishmentToast } from './usePunishmentToast';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';

interface UsePunishmentApplyProps {
  id?: string;
  points: number;
  applyPunishment?: (punishmentId: string, points: number) => Promise<PunishmentHistoryItem | void>;
}

export const usePunishmentApply = ({ id, points, applyPunishment }: UsePunishmentApplyProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const toast = usePunishmentToast();

  const handlePunish = async () => {
    if (!id || isApplying || !applyPunishment) return;
    
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
