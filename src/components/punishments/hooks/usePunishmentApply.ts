
import { useState } from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { toast } from '@/hooks/use-toast';

interface UsePunishmentApplyProps {
  id?: string;
  points: number;
}

export const usePunishmentApply = ({ id, points }: UsePunishmentApplyProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const { applyPunishment } = usePunishments();
  
  /**
   * Handle applying a punishment, deducting points, and recording in history
   */
  const handlePunish = async () => {
    if (!id) {
      console.error("Cannot apply punishment: No ID provided");
      return;
    }
    
    try {
      setIsApplying(true);
      
      // Get current day of week (0-6, Sunday is 0)
      const now = new Date();
      const dayOfWeek = now.getDay();
      
      // First record this in the punishment history
      const punishmentData = {
        punishment_id: id,
        points_deducted: points,
        day_of_week: dayOfWeek
      };
      
      // Call the context function to update both Supabase and local state
      await applyPunishment(punishmentData);
      
      toast({
        title: "Punishment Applied",
        description: `${points} points have been deducted`
      });
      
      setIsApplying(false);
    } catch (error) {
      console.error("Error applying punishment:", error);
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive"
      });
      
      setIsApplying(false);
    }
  };
  
  return {
    handlePunish,
    isApplying
  };
};
