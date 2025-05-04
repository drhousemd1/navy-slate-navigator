
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '@/contexts/punishments/types';
import { PUNISHMENTS_QUERY_KEY } from '../queries';

/**
 * Updates an existing punishment and updates the cache optimistically
 */
export const updatePunishmentMutation = (queryClient: QueryClient, onSuccess?: () => void) => 
  async ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => {
    console.log("[updatePunishmentMutation] Updating punishment:", { id, punishment });
    const startTime = performance.now();
    
    try {
      // Get the current data for optimistic update
      const currentData = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      const currentItem = currentData.find(p => p.id === id);
      
      if (!currentItem) {
        console.error("[updatePunishmentMutation] Punishment not found in cache:", id);
        throw new Error("Punishment not found in cache");
      }
      
      // Create optimistic update
      const optimisticUpdate = {
        ...currentItem,
        ...punishment,
        updated_at: new Date().toISOString()
      };
      
      // Update cache immediately
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
        old.map(p => p.id === id ? optimisticUpdate : p)
      );
      
      console.log("[updatePunishmentMutation] Making API call to update punishment:", id);
      
      // Make the actual API call
      const { data, error } = await supabase
        .from('punishments')
        .update(punishment)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("[updatePunishmentMutation] Supabase error:", error);
        throw error;
      }
      
      console.log("[updatePunishmentMutation] API call successful, received data:", data);
      
      // Update cache with actual data from server
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
        old.map(p => p.id === id ? data : p)
      );
      
      const endTime = performance.now();
      console.log(`[updatePunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      return data;
    } catch (error) {
      console.error("[updatePunishmentMutation] Error details:", error);
      
      // Revert cache in case of error
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      throw error;
    }
  };
