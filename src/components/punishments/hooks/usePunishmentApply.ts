
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
  const [applying, setApplying] = useState(false);
  
  const handlePunish = async () => {
    if (!id || applying) return;
    
    try {
      setApplying(true);
      // First update the total points in the UI immediately
      const newTotal = totalPoints - points;
      setTotalPoints(newTotal);
      
      // Then call the applyPunishment function with the punishment object
      await applyPunishment({
        id: id,
        points: points
      });
    } catch (error) {
      console.error('Error applying punishment:', error);
      setTotalPoints(totalPoints); // Revert the points on error
      showErrorToast("Failed to apply punishment. Please try again.");
    } finally {
      setApplying(false);
    }
  };
  
  return { handlePunish, applying };
};
