
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentHistoryItem } from '../types';

interface UsePunishmentApplyProps {
  setPunishmentHistory: (callback: (prev: PunishmentHistoryItem[]) => PunishmentHistoryItem[]) => void;
  setTotalPointsDeducted: (callback: (prev: number) => number) => void;
}

/**
 * Hook for applying punishments
 */
export const usePunishmentApply = ({ 
  setPunishmentHistory, 
  setTotalPointsDeducted 
}: UsePunishmentApplyProps) => {
  
  const applyPunishment = async (punishmentId: string): Promise<void> => {
    try {
      // Get the punishment data to get points
      const { data: punishmentData, error: punishmentError } = await supabase
        .from('punishments')
        .select('points')
        .eq('id', punishmentId)
        .single();
      
      if (punishmentError) throw punishmentError;
      
      const points = punishmentData.points;
      
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      const historyEntry = {
        punishment_id: punishmentId,
        day_of_week: dayOfWeek,
        points_deducted: points
      };
      
      const { data, error } = await supabase
        .from('punishment_history')
        .insert(historyEntry)
        .select()
        .single();
      
      if (error) throw error;
      
      setPunishmentHistory(prev => [data, ...prev]);
      setTotalPointsDeducted(prev => prev + points);
      
      toast({
        title: "Punishment Applied",
        description: `${points} points deducted.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error applying punishment:', error);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { applyPunishment };
};
