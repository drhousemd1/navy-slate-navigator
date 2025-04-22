
import { usePunishments } from '@/contexts/PunishmentsContext';
import { useRewards } from '@/contexts/RewardsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';

export const useApplyRandomPunishment = (onClose: () => void) => {
  const { applyPunishment } = usePunishments();
  const { totalPoints, setTotalPoints } = useRewards();
  
  const handlePunish = async (selectedPunishment: PunishmentData | null) => {
    if (!selectedPunishment || !selectedPunishment.id) return;
    
    try {
      // First update the total points in the UI immediately
      const newTotal = totalPoints - selectedPunishment.points;
      setTotalPoints(newTotal);
      
      // Then call the applyPunishment function - now with just the punishment object
      await applyPunishment(selectedPunishment);
      
      // Show success toast
      toast({
        title: "Punishment Applied",
        description: `${selectedPunishment.points} points deducted.`,
        variant: "destructive",
      });
      
      onClose();
    } catch (error) {
      console.error("Error applying punishment:", error);
      // Revert the point deduction if there was an error
      setTotalPoints(totalPoints);
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return { handlePunish };
};
