
import { usePunishments } from '@/contexts/PunishmentsContext'; // Corrected: This should be from the new provider path if changed
import { useRewards } from '@/contexts/RewardsContext';
import { PunishmentData, ApplyPunishmentArgs } from '@/contexts/punishments/types'; // Ensure ApplyPunishmentArgs is imported
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger'; // Added logger import

export const useApplyRandomPunishment = (onClose: () => void) => {
  const { applyPunishment } = usePunishments();
  const { totalPoints, setTotalPoints, domPoints } = useRewards();
  
  const handlePunish = async (selectedPunishment: PunishmentData | null) => {
    if (!selectedPunishment || !selectedPunishment.id) {
      toast({
        title: "Error",
        description: "No punishment selected or punishment ID is missing.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }
      
      const newTotal = totalPoints - selectedPunishment.points;
      setTotalPoints(newTotal); // Optimistic UI update
      
      const args: ApplyPunishmentArgs = {
        id: selectedPunishment.id,
        costPoints: selectedPunishment.points,
        domEarn: Math.ceil(selectedPunishment.points / 2), // Default domEarn logic
        profileId: user.id,
        subPoints: totalPoints, // Pass current points before deduction for backend calculation
        domPoints: domPoints || 0
      };
      
      await applyPunishment(args);
      
      toast({
        title: "Punishment Applied",
        description: `${selectedPunishment.points} points deducted.`,
        variant: "destructive",
      });
      
      onClose();
    } catch (error) {
      logger.error("Error applying punishment:", error); // Replaced console.error
      setTotalPoints(totalPoints); // Revert optimistic update on error
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return { handlePunish };
};
