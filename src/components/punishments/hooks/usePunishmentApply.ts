
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
      // First update the total points in the UI immediately
      const newTotal = totalPoints - points;
      setTotalPoints(newTotal);
      
      // Then call the applyPunishment function - now with just the punishment ID
      await applyPunishment({
        id: id,
        points: points
      });
    } catch (error) {
      console.error('Error applying punishment:', error);
      setTotalPoints(totalPoints);
      showErrorToast("Failed to apply punishment. Please try again.");
    }
  };
  
  return { handlePunish };
};
