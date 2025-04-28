
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { 
  PUNISHMENTS_QUERY_KEY, 
  PUNISHMENT_HISTORY_QUERY_KEY,
  fetchPunishments,
  fetchCurrentWeekPunishmentHistory
} from './queries';
import {
  createPunishmentMutation,
  updatePunishmentMutation,
  applyPunishmentMutation,
  deletePunishmentMutation
} from './mutations';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();

  const {
    data: punishments = [],
    isLoading: punishmentsLoading,
    error: punishmentsError,
    refetch: refetchPunishments
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    ...STANDARD_QUERY_CONFIG
  });

  const {
    data: punishmentHistory = [],
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchCurrentWeekPunishmentHistory,
    ...STANDARD_QUERY_CONFIG
  });

  const createPunishmentMut = useMutation({
    mutationFn: createPunishmentMutation(queryClient),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY, exact: true });
    }
  });

  const updatePunishmentMut = useMutation({
    mutationFn: updatePunishmentMutation(queryClient),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY, exact: true });
    }
  });

  const applyPunishmentMut = useMutation({
    mutationFn: applyPunishmentMutation(queryClient),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY, exact: true });
    }
  });

  const deletePunishmentMut = useMutation({
    mutationFn: deletePunishmentMutation(queryClient)
  });

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  const totalPointsDeducted = punishmentHistory.reduce(
    (total, item) => total + item.points_deducted, 
    0
  );

  const refetchPunishmentsTyped = (options?: RefetchOptions) => {
    return refetchPunishments(options) as Promise<QueryObserverResult<PunishmentData[], Error>>;
  };

  const refetchHistoryTyped = (options?: RefetchOptions) => {
    return refetchHistory(options) as Promise<QueryObserverResult<PunishmentHistoryItem[], Error>>;
  };

  const fetchPunishmentsTyped = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY })
    ]);
  };

  // Create a wrapper function that adapts to the expected interface
  const updatePunishmentWrapper = (id: string, punishment: Partial<PunishmentData>): Promise<PunishmentData> => {
    return updatePunishmentMut.mutateAsync({ id, punishment });
  };

  // Create a wrapper function for applyPunishment as well to match the context type
  const applyPunishmentWrapper = (punishment: PunishmentData | { id: string; points: number }): Promise<PunishmentHistoryItem> => {
    return applyPunishmentMut.mutateAsync(punishment as { id: string; points: number });
  };

  return {
    punishments,
    punishmentHistory,
    loading: punishmentsLoading,
    historyLoading,
    error: punishmentsError || historyError,
    isSelectingRandom: false,
    selectedPunishment: null,
    createPunishment: createPunishmentMut.mutateAsync,
    updatePunishment: updatePunishmentWrapper,
    deletePunishment: deletePunishmentMut.mutateAsync,
    applyPunishment: applyPunishmentWrapper,
    selectRandomPunishment: () => {},
    resetRandomSelection: () => {},
    fetchPunishments: fetchPunishmentsTyped,
    refetchPunishments: refetchPunishmentsTyped,
    refetchHistory: refetchHistoryTyped,
    getPunishmentHistory,
    totalPointsDeducted
  };
};
