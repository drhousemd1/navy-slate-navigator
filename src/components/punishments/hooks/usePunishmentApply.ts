
import { useState } from 'react';
import { useRewards } from '@/contexts/RewardsContext';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { usePunishmentToast } from './usePunishmentToast';

interface UsePunishmentApplyProps {
  id?: string;
  points: number;
}

export const usePunishmentApply = ({ id, points }: UsePunishmentApplyProps) => {
  const { totalPoints, setTotalPoints } = useRewards();
  const { applyPunishment } = usePunishments();
  const { showErrorToast } = usePunishmentToast();
  
  const handlePunish = async () => {
    if (!id) return;
    
    try {
      const newTotal = totalPoints - points;
      setTotalPoints(newTotal);
      
      await applyPunishment(id, points);
    } catch (error) {
      console.error('Error applying punishment:', error);
      setTotalPoints(totalPoints);
      showErrorToast("Failed to apply punishment. Please try again.");
    }
  };
  
  return { handlePunish };
};
