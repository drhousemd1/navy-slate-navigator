import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { PUNISHMENT_HISTORY_QUERY_KEY } from '../queries';
import { logger } from '@/lib/logger';

/**
 * Applies a punishment and updates the cache optimistically
 */
export const applyPunishmentMutation = (queryClient: QueryClient) => 
  async (punishment: { id: string; points: number }) => {
    logger.debug("[applyPunishmentMutation] Applying punishment:", punishment);
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
      logger.debug(`[applyPunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      toast({
        title: "Success",
        description: "Punishment applied successfully"
      });
      
      return data;
    } catch (error) {
      logger.error("[applyPunishmentMutation] Error:", error);
      
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
