
import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { useRewards } from '@/contexts/RewardsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';

export const useApplyRandomPunishment = (onClose: () => void) => {
  const [isApplying, setIsApplying] = useState(false);
  const { applyPunishment } = usePunishments();
  const { setTotalPoints } = useRewards();
  
  const handlePunish = async (selectedPunishment: PunishmentData | null) => {
    if (!selectedPunishment || !selectedPunishment.id) return;
    
    try {
      setIsApplying(true);
      
      // Get current day of week (0-6, Sunday is 0)
      const now = new Date();
      const dayOfWeek = now.getDay();
      
      // Create the punishment history object
      const punishmentData = {
        punishment_id: selectedPunishment.id,
        points_deducted: selectedPunishment.points,
        day_of_week: dayOfWeek
      };
      
      // Apply the punishment
      await applyPunishment(punishmentData);
      
      // Show success toast
      toast({
        title: "Punishment Applied",
        description: `${selectedPunishment.points} points deducted.`,
        variant: "destructive",
      });
      
      setIsApplying(false);
      onClose();
    } catch (error) {
      console.error("Error applying punishment:", error);
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
      
      setIsApplying(false);
    }
  };
  
  return { handlePunish, isApplying };
};
