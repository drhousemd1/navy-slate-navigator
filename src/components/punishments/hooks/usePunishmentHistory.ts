// Fix import path from punishment context
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentHistoryItem } from '@/contexts/PunishmentsContext';
import { convertToMondayBasedIndex } from '@/lib/utils';

interface UsePunishmentHistoryProps {
  id?: string;
}

export const usePunishmentHistory = ({ id }: UsePunishmentHistoryProps) => {
  const { getPunishmentHistory } = usePunishments();

  const getHistory = (): PunishmentHistoryItem[] => {
    return id ? getPunishmentHistory(id) : [];
  };
  
  const getWeekData = (): number[] => {
    const history = getHistory();
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    
    const weekData = [0, 0, 0, 0, 0, 0, 0];
    
    history.forEach(item => {
      const itemDate = new Date(item.applied_date!);
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
