
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '../types';

interface UsePunishmentDeleteProps {
  setPunishments: (callback: (prev: PunishmentData[]) => PunishmentData[]) => void;
  setPunishmentHistory: (callback: (prev: PunishmentHistoryItem[]) => PunishmentHistoryItem[]) => void;
}

/**
 * Hook for deleting punishments
 */
export const usePunishmentDelete = ({ 
  setPunishments, 
  setPunishmentHistory 
}: UsePunishmentDeleteProps) => {
  
  const deletePunishment = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setPunishments(prev => prev.filter(punishment => punishment.id !== id));
      setPunishmentHistory(prev => prev.filter(item => item.punishment_id !== id));
      
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting punishment:', error);
      toast({
        title: "Error",
        description: "Failed to delete punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { deletePunishment };
};
