
import { useMemo } from 'react';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { generateMondayBasedWeekDates, convertToMondayBasedIndex } from '@/lib/utils';

interface UsePunishmentHistoryProps {
  id?: string;
  getPunishmentHistory?: (id: string) => PunishmentHistoryItem[];
}

export const usePunishmentHistory = ({ id, getPunishmentHistory }: UsePunishmentHistoryProps) => {
  // If no getPunishmentHistory function is provided, return empty data
  const punishmentHistory = useMemo(() => {
    if (!id || !getPunishmentHistory) return [];
    return getPunishmentHistory(id);
  }, [id, getPunishmentHistory]);

  // Calculate the weekly usage data
  const getWeekData = () => {
    const currentWeekDates = generateMondayBasedWeekDates();
    
    // Initialize with all days at 0
    const usageByDay = Array(7).fill(0);
    
    if (punishmentHistory.length > 0) {
      // Count applications by day
      punishmentHistory.forEach(item => {
        const itemDate = new Date(item.applied_date);
        const dateString = itemDate.toISOString().split('T')[0];
        
        // If the date is in the current week, increment the count
        const dayIndex = currentWeekDates.indexOf(dateString);
        if (dayIndex !== -1) {
          usageByDay[dayIndex]++;
        }
      });
    }
    
    return usageByDay;
  };

  // Get the total frequency count for this punishment
  const getFrequencyCount = () => {
    return punishmentHistory.length;
  };

  return {
    getWeekData,
    getFrequencyCount,
  };
};
