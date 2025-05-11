
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { PunishmentData } from '@/contexts/punishments/types';
import { usePunishmentsQuery, usePunishmentHistoryQuery } from '../queries/usePunishmentsQuery';
import { useRedeemPunishment } from '../mutations/useRedeemPunishment';

export function usePunishmentsData() {
  const { data: punishments, isLoading, error, refetch: refetchPunishments } = usePunishmentsQuery();
  const { data: punishmentHistory, refetch: refetchHistory } = usePunishmentHistoryQuery();
  const redeemPunishmentMutation = useRedeemPunishment();
  
  const savePunishment = async (punishmentData: PunishmentData): Promise<PunishmentData | null> => {
    // Not implemented in this iteration - would be a dedicated useCreatePunishment or useUpdatePunishment hook
    console.error('Save punishment not implemented yet');
    return null;
  };
  
  const deletePunishment = async (punishmentId: string): Promise<boolean> => {
    // Not implemented in this iteration - would be a dedicated useDeletePunishment hook
    console.error('Delete punishment not implemented yet');
    return false;
  };
  
  const applyPunishment = async (punishment: PunishmentData): Promise<boolean> => {
    try {
      await redeemPunishmentMutation.mutateAsync({ punishment });
      await refetchHistory();
      return true;
    } catch (err) {
      console.error('Error in applyPunishment:', err);
      return false;
    }
  };
  
  // Calculate total points deducted from punishment history
  const totalPointsDeducted = punishmentHistory?.reduce((total, item) => total + (item.points_deducted || 0), 0) || 0;
  
  return {
    punishments,
    punishmentHistory,
    totalPointsDeducted,
    isLoading,
    error,
    savePunishment,
    deletePunishment,
    applyPunishment,
    refetchPunishments
  };
}
