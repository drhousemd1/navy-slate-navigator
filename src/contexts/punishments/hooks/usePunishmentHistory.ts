
import { PunishmentHistoryItem } from '../types';

interface UsePunishmentHistoryProps {
  punishmentHistory: PunishmentHistoryItem[];
}

/**
 * Hook for accessing punishment history
 */
export const usePunishmentHistory = ({ punishmentHistory }: UsePunishmentHistoryProps) => {
  
  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  return { getPunishmentHistory };
};
