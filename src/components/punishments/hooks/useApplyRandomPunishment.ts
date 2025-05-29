
import { useState, useCallback } from 'react';
import { useApplyPunishment } from '@/data/punishments/mutations/useApplyPunishment';
import { PunishmentData } from '@/contexts/punishments/types';
import { usePoints } from '@/data/points/useUserPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export const useApplyRandomPunishment = (onClose?: () => void) => {
  const [isApplying, setIsApplying] = useState(false);
  const applyPunishmentMutation = useApplyPunishment();
  const { subUserId } = useUserIds();
  const { data: currentPoints = 0 } = usePoints(subUserId);

  const handlePunish = useCallback(async (punishment: PunishmentData) => {
    if (!subUserId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    if (!punishment.id) {
      toast({
        title: "Error", 
        description: "Invalid punishment data",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      await applyPunishmentMutation.mutateAsync({
        punishmentId: punishment.id,
        pointsDeducted: punishment.points,
        dayOfWeek: new Date().getDay(),
        currentPoints: currentPoints
      });
      
      toast({
        title: "Punishment Applied",
        description: `${punishment.title} has been applied.`
      });

      if (onClose) {
        onClose();
      }
    } catch (error) {
      logger.error('Error applying random punishment:', error);
      toast({
        title: "Error",
        description: "Failed to apply punishment",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  }, [applyPunishmentMutation, currentPoints, subUserId, onClose]);

  return {
    handlePunish,
    isApplying,
  };
};
