
import { useMemo } from 'react';
import { useQuery, QueryObserverResult } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem } from '../types';
import usePunishmentsQuery from '@/data/queries/usePunishments';
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';

export const usePunishmentDataFetching = () => {
  const {
    data: punishments = [],
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetch: refetchPunishmentsFn
  } = usePunishmentsQuery();

  const {
    data: punishmentHistory = [],
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistoryFn
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: ['allPunishmentHistory'],
    queryFn: fetchAllPunishmentHistory,
    staleTime: Infinity,
  });

  const totalPointsDeducted = useMemo(() => {
    return (punishmentHistory || []).reduce((sum, item) => sum + item.points_deducted, 0);
  }, [punishmentHistory]);

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return (punishmentHistory || []).filter(item => item.punishment_id === punishmentId);
  };

  const refetchPunishmentsAndHistory = async (): Promise<QueryObserverResult<PunishmentData[], Error>> => {
    await refetchHistoryFn();
    return await refetchPunishmentsFn();
  };

  return {
    punishments: punishments || [],
    isLoadingPunishments,
    errorPunishments,
    punishmentHistory: punishmentHistory || [],
    isLoadingHistory,
    errorHistory,
    totalPointsDeducted,
    getPunishmentHistory,
    refetchPunishmentsAndHistory,
  };
};
