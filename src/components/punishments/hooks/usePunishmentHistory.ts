
import { useMemo } from 'react';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { generateMondayBasedWeekDates, convertToMondayBasedIndex } from '@/lib/utils';
import { usePunishmentsQuery } from '@/hooks/usePunishmentsQuery';

interface UsePunishmentHistoryProps {
  id?: string;
}

export const usePunishmentHistory = ({ id }: UsePunishmentHistoryProps) => {
  const { getPunishmentHistory } = usePunishmentsQuery();
  
  // Get punishment history for this specific punishment
  const punishmentHistory = useMemo(() => {
    if (!id) return [];
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
