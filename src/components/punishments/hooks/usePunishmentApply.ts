
import { useState } from 'react';
import { useApplyPunishment } from '@/data/punishments/mutations/useApplyPunishment';
import { PunishmentData } from '@/contexts/punishments/types';
import { usePoints } from '@/data/points/useUserPointsQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import { toastManager } from '@/lib/toastManager';
import { logger } from '@/lib/logger';

export const usePunishmentApply = () => {
  const [isApplying, setIsApplying] = useState(false);
  const applyPunishmentMutation = useApplyPunishment();
  const { subUserId } = useUserIds();
  const { data: currentPoints = 0 } = usePoints(subUserId);

  const handlePunish = async (punishment: PunishmentData) => {
    if (!subUserId) {
      toastManager.error("Error", "User not authenticated");
      return;
    }

    if (!punishment.id) {
      toastManager.error("Error", "Invalid punishment data");
      return;
    }

    setIsApplying(true);
    try {
      await applyPunishmentMutation.mutateAsync({
        punishmentId: punishment.id,
        pointsDeducted: punishment.points,
        domPointsAwarded: punishment.dom_points,
        dayOfWeek: new Date().getDay(),
        currentPoints: currentPoints
      });
    } catch (error) {
      logger.error('Error applying punishment:', error);
      // Error toast is handled by the mutation
    } finally {
      setIsApplying(false);
    }
  };

  return {
    handlePunish,
    isApplying,
  };
};
