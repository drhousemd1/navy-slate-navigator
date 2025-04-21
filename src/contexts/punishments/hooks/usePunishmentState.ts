
import { useState } from 'react';
import { PunishmentData, PunishmentHistoryItem } from '../types';

/**
 * Hook for managing the state of punishments
 */
export const usePunishmentState = () => {
  const [punishments, setPunishments] = useState<PunishmentData[]>([]);
  const [punishmentHistory, setPunishmentHistory] = useState<PunishmentHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalPointsDeducted, setTotalPointsDeducted] = useState<number>(0);

  return {
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
  };
};
