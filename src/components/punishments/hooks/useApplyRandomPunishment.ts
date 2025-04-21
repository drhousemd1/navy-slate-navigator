
// Fix import path to punishment types, use correct context with applyPunishment method
import { usePunishments } from '@/contexts/PunishmentsContext';
import { useRewards } from '@/contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';

export const useApplyRandomPunishment = (onClose: () => void) => {
  const { applyPunishment } = usePunishments();
  const { totalPoints, setTotalPoints } = useRewards();

  const handlePunish = async (selectedPunishment: any | null) => {
    if (!selectedPunishment || !selectedPunishment.id) return;

    try {
      const newTotal = totalPoints - selectedPunishment.points;
      setTotalPoints(newTotal);

      await applyPunishment(selectedPunishment.id, selectedPunishment.points);

      toast({
        title: 'Punishment Applied',
        description: `${selectedPunishment.points} points deducted.`,
        variant: 'destructive',
      });

      onClose();
    } catch (error) {
      console.error('Error applying punishment:', error);
      setTotalPoints(totalPoints);

      toast({
        title: 'Error',
        description: 'Failed to apply punishment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return { handlePunish };
};
