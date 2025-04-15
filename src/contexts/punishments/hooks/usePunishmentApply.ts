
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentHistoryItem } from '../types';

interface UsePunishmentApplyProps {
  setPunishmentHistory: (history: PunishmentHistoryItem[] | ((prev: PunishmentHistoryItem[]) => PunishmentHistoryItem[])) => void;
  setTotalPointsDeducted: (total: number | ((prev: number) => number)) => void;
}

export const usePunishmentApply = ({
  setPunishmentHistory,
  setTotalPointsDeducted
}: UsePunishmentApplyProps) => {
  
  const applyPunishment = async (punishmentData: Partial<PunishmentHistoryItem>): Promise<void> => {
    try {
      // Insert into punishment_history table
      const { data, error } = await supabase
        .from('punishment_history')
        .insert({
          punishment_id: punishmentData.punishment_id,
          points_deducted: punishmentData.points_deducted,
          day_of_week: punishmentData.day_of_week
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state with the new history item
      setPunishmentHistory(prev => [data, ...prev]);
      
      // Update total points deducted
      if (punishmentData.points_deducted) {
        setTotalPointsDeducted(prev => prev + punishmentData.points_deducted);
      }
      
      // Update localStorage punishment_history
      try {
        const cachedHistoryJSON = localStorage.getItem('punishment_history');
        if (cachedHistoryJSON) {
          const cachedItem = JSON.parse(cachedHistoryJSON);
          
          if (cachedItem && cachedItem.data && Array.isArray(cachedItem.data)) {
            // Create updated cache with the new item at the beginning
            const updatedCache = {
              timestamp: Date.now(),
              data: [data, ...cachedItem.data]
            };
            
            localStorage.setItem('punishment_history', JSON.stringify(updatedCache));
          }
        }
      } catch (cacheError) {
        // Silent fail on cache updates - non-critical
        console.warn('Failed to update punishment history cache:', cacheError);
      }
      
      // Changed to return void instead of data
    } catch (error) {
      console.error('Error applying punishment:', error);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  return { applyPunishment };
};
