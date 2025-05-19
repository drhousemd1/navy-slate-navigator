
import { usePunishmentDataFetching } from './hooks/usePunishmentDataFetching';
import { usePunishmentMutations } from './hooks/usePunishmentMutations';

export const usePunishmentOperations = () => {
  const dataFetchingOps = usePunishmentDataFetching();
  const mutationOps = usePunishmentMutations();

  return {
    // From usePunishmentDataFetching
    punishments: dataFetchingOps.punishments,
    isLoadingPunishments: dataFetchingOps.isLoadingPunishments,
    errorPunishments: dataFetchingOps.errorPunishments,
    punishmentHistory: dataFetchingOps.punishmentHistory,
    isLoadingHistory: dataFetchingOps.isLoadingHistory,
    errorHistory: dataFetchingOps.errorHistory,
    totalPointsDeducted: dataFetchingOps.totalPointsDeducted,
    getPunishmentHistory: dataFetchingOps.getPunishmentHistory,
    refetchPunishments: dataFetchingOps.refetchPunishmentsAndHistory, // Renamed for clarity in composed hook

    // From usePunishmentMutations
    createPunishment: mutationOps.createPunishment,
    updatePunishment: mutationOps.updatePunishment,
    deletePunishment: mutationOps.deletePunishment,
    applyPunishment: mutationOps.applyPunishment,
  };
};
