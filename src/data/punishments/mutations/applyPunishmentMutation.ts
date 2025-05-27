
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { PUNISHMENT_HISTORY_QUERY_KEY } from '../queries';
import { logger } from '@/lib/logger'; // Added logger import

/**
 * Applies a punishment and updates the cache optimistically
 */
export const applyPunishmentMutation = (queryClient: QueryClient) => 
  async (punishment: { id: string; points: number }) => {
    logger.log("[applyPunishmentMutation] Applying punishment:", punishment); // Replaced console.log
    const startTime = performance.now();
    
    try {
      // Create optimistic history entry
      const today = new Date();
      const tempId = `temp-${Date.now()}`;
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: tempId,
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: today.getDay(),
        applied_date: today.toISOString()
      };
      
      // Update cache immediately
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );
      
      // Make the actual API call
      const historyEntry = {
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: today.getDay()
        // applied_date is handled by DB default (timestamptz default now())
      };
      
      const { data, error } = await supabase
        .from('punishment_history')
        .insert(historyEntry)
        .select()
        .single();

      if (error) throw error;
      
      // Update cache with actual data
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        old.map(h => h.id === tempId ? data : h)
      );
      
      const endTime = performance.now();
      logger.log(`[applyPunishmentMutation] Operation completed in ${endTime - startTime}ms`); // Replaced console.log
      
      toast({
        title: "Success",
        description: "Punishment applied successfully"
      });
      
      return data;
    } catch (error) {
      logger.error("[applyPunishmentMutation] Error:", error); // Replaced console.error
      
      // Remove optimistic entry on error
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        old.filter(h => !h.id.toString().startsWith('temp-'))
      );
      
      toast({
        title: "Error",
        description: "Failed to apply punishment",
        variant: "destructive",
      });
      
      throw error;
    }
  };

