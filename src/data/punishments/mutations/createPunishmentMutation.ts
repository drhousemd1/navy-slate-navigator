
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '@/contexts/punishments/types';
import { PUNISHMENTS_QUERY_KEY } from '../queries';

/**
 * Creates a new punishment and updates the cache optimistically
 */
export const createPunishmentMutation = (queryClient: QueryClient, onSuccess?: () => void) => 
  async (newPunishment: Omit<Partial<PunishmentData>, 'title'> & { title: string }) => {
    console.log("[createPunishmentMutation] Creating punishment:", newPunishment);
    const startTime = performance.now();
    
    try {
      // Optimistic update - add a temporary entry to the cache
      const tempId = `temp-${Date.now()}`;
      const optimisticPunishment = {
        id: tempId,
        ...newPunishment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as PunishmentData;

      // Update local cache immediately for better UI responsiveness
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => 
        [optimisticPunishment, ...old]
      );
      
      // Perform the actual API call
      const { data, error } = await supabase
        .from('punishments')
        .insert(newPunishment)
        .select()
        .single();

      if (error) throw error;
      
      // Replace optimistic entry with actual data
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => 
        old.map(p => p.id === tempId ? data : p)
      );
      
      const endTime = performance.now();
      console.log(`[createPunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      toast({
        title: "Success",
        description: "Punishment created successfully"
      });
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      return data;
    } catch (error) {
      console.error("[createPunishmentMutation] Error:", error);
      
      // Remove the optimistic entry in case of error
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
        old.filter(p => !p.id.toString().startsWith('temp-'))
      );
      
      toast({
        title: "Error",
        description: "Failed to create punishment",
        variant: "destructive",
      });
      
      throw error;
    }
  };
