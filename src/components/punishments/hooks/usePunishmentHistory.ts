
import { useState } from 'react';
import { usePunishments, PunishmentHistoryItem } from '@/contexts/PunishmentsContext';
import { convertToMondayBasedIndex } from '@/lib/utils';

interface UsePunishmentHistoryProps {
  id?: string;
}

export const usePunishmentHistory = ({ id }: UsePunishmentHistoryProps) => {
  const { getPunishmentHistory, historyLoading } = usePunishments();
  
  const getHistory = (): PunishmentHistoryItem[] => {
    return id ? getPunishmentHistory(id) : [];
  };
  
  const getWeekData = (): number[] => {
    const history = getHistory();
    // Initialize array with zeros for Monday to Sunday
    const weekData = [0, 0, 0, 0, 0, 0, 0];
    
    // Since we're already filtering at the database level,
    // we can just map the history items to their respective days
    history.forEach(item => {
      // Convert the day_of_week to Monday-based index
      const mondayBasedDayIndex = convertToMondayBasedIndex(item.day_of_week);
      weekData[mondayBasedDayIndex] = 1;
    });
    
    return weekData;
  };
  
  const getFrequencyCount = (): number => {
    const weekData = getWeekData();
    return weekData.reduce((acc, val) => acc + val, 0);
  };
  
  return {
    getHistory,
    getWeekData,
    getFrequencyCount,
    isLoading: historyLoading
  };
};
