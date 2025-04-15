
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '../types';

interface UsePunishmentUpdateProps {
  setPunishments: (callback: (prev: PunishmentData[]) => PunishmentData[]) => void;
}

/**
 * Hook for updating existing punishments
 */
export const usePunishmentUpdate = ({ setPunishments }: UsePunishmentUpdateProps) => {
  
  const updatePunishment = async (id: string, punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      const { id: _, ...dataToUpdate } = punishmentData;
      
      console.log("Updating punishment with ID:", id);
      console.log("Data to update:", dataToUpdate);
      
      const { data, error } = await supabase
        .from('punishments')
        .update(dataToUpdate)
        .eq('id', id)
        .select() // Add this line to return the updated data
        .single();
      
      if (error) throw error;
      
      // Update the local state
      setPunishments(prev => 
        prev.map(punishment => 
          punishment.id === id ? { ...punishment, ...dataToUpdate } : punishment
        )
      );
      
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });

      // Return the updated punishment data
      return { ...data, id } as PunishmentData;
    } catch (error) {
      console.error('Error updating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to update punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { updatePunishment };
};
