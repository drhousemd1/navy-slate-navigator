
import { useState } from 'react';
import { usePunishments, PunishmentHistoryItem } from '@/contexts/PunishmentsContext';
import { convertToMondayBasedIndex } from '@/lib/utils';

interface UsePunishmentHistoryProps {
  id?: string;
}

export const usePunishmentHistory = ({ id }: UsePunishmentHistoryProps) => {
  const { punishmentHistory } = usePunishments();
  
  const getHistory = (): PunishmentHistoryItem[] => {
    // Instead of calling getPunishmentHistory, we'll filter the history directly
    return id 
      ? punishmentHistory.filter(item => item.punishment_id === id)
      : [];
  };
  
  const getWeekData = (): number[] => {
    const history = getHistory();
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    
    const weekData = [0, 0, 0, 0, 0, 0, 0];
    
    history.forEach(item => {
      const itemDate = new Date(item.applied_date);
      const daysSinceToday = Math.floor((currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceToday < 7) {
        // Convert the day_of_week to Monday-based index
        const mondayBasedDayIndex = convertToMondayBasedIndex(item.day_of_week);
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
    getFrequencyCount
  };
};
