
import { usePunishmentState } from './hooks/usePunishmentState';
import { usePunishmentFetch } from './hooks/usePunishmentFetch';
import { usePunishmentCreate } from './hooks/usePunishmentCreate';
import { usePunishmentUpdate } from './hooks/usePunishmentUpdate';
import { usePunishmentDelete } from './hooks/usePunishmentDelete';
import { usePunishmentApply } from './hooks/usePunishmentApply';
import { usePunishmentHistory } from './hooks/usePunishmentHistory';
import { PunishmentData, PunishmentHistoryItem } from './types';

export const usePunishmentOperations = () => {
  // Initialize state
  const {
    punishments,
    setPunishments,
    punishmentHistory,
    setPunishmentHistory,
    loading,
    setLoading,
    error,
    setError,
    totalPointsDeducted,
    setTotalPointsDeducted
  } = usePunishmentState();

  // Initialize hooks
  const { fetchPunishments } = usePunishmentFetch({
    setPunishments,
    setPunishmentHistory,
    setLoading,
    setError,
    setTotalPointsDeducted
  });

  const { createPunishment } = usePunishmentCreate({
    setPunishments
  });

  const { updatePunishment } = usePunishmentUpdate({
    setPunishments
  });

  const { deletePunishment } = usePunishmentDelete({
    setPunishments,
    setPunishmentHistory
  });

  const { applyPunishment } = usePunishmentApply({
    setPunishmentHistory,
    setTotalPointsDeducted
  });

  const { getPunishmentHistory } = usePunishmentHistory({
    punishmentHistory
  });

  // Return all operations and state
  return {
    punishments,
    punishmentHistory,
    loading,
    error,
    totalPointsDeducted,
    fetchPunishments,
    createPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    getPunishmentHistory
  };
};
