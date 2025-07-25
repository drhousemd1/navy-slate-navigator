
import { useState, useEffect } from 'react';
import { usePunishments } from '@/contexts/punishments/PunishmentsProvider';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';

interface UsePunishmentHistoryProps {
  id?: string;
}

export const usePunishmentHistory = ({ id }: UsePunishmentHistoryProps) => {
  // Destructure with correct names from the updated context type
  const { getPunishmentHistory, historyLoading } = usePunishments();
  
  const getHistory = (): PunishmentHistoryItem[] => {
    return id ? getPunishmentHistory(id) : [];
  };
  
  const getWeekData = (): number[] => {
    const history = getHistory();
    const weekData = [0, 0, 0, 0, 0, 0, 0]; 
    
    history.forEach(item => {
      const mondayBasedDayIndex = item.day_of_week; // Already Monday-based
      // Ensure index is within bounds
      if (mondayBasedDayIndex >= 0 && mondayBasedDayIndex < 7) {
        weekData[mondayBasedDayIndex] = 1; 
      }
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
    isLoading: historyLoading // historyLoading from context
  };
};
