
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '../queries';

/**
 * Deletes a punishment and updates the cache optimistically
 */
export const deletePunishmentMutation = (queryClient: QueryClient) => 
  async (id: string) => {
    console.log("[deletePunishmentMutation] Deleting punishment:", id);
    const startTime = performance.now();
    
    try {
      // Update cache immediately (optimistic delete)
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, 
        (old = []) => old.filter(p => p.id !== id)
      );
      
      // Make the actual API call
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Also filter history items for deleted punishment
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY,
        (old = []) => old.filter(h => h.punishment_id !== id)
      );
      
      const endTime = performance.now();
      console.log(`[deletePunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      toast({
        title: "Success",
        description: "Punishment deleted successfully"
      });
    } catch (error) {
      console.error("[deletePunishmentMutation] Error:", error);
      
      // Revert the cache changes in case of error
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive",
      });
      
      throw error;
    }
  };
