
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';
import { queryClient } from '@/data/queryClient';
import { toast } from '@/hooks/use-toast';

interface UpdatePunishmentVariables {
  id: string;
  punishment: Partial<PunishmentData>;
}

export const useUpdatePunishmentOptimistic = () => {
  return useMutation({
    mutationFn: async ({ id, punishment }: UpdatePunishmentVariables): Promise<PunishmentData> => {
      const { data, error } = await supabase
        .from('punishments')
        .update({
          title: punishment.title,
          description: punishment.description,
          points: punishment.points,
          icon_name: punishment.icon_name,
          icon_color: punishment.icon_color,
          background_image_url: punishment.background_image_url,
          background_opacity: punishment.background_opacity,
          title_color: punishment.title_color,
          subtext_color: punishment.subtext_color,
          calendar_color: punishment.calendar_color,
          highlight_effect: punishment.highlight_effect,
          focal_point_x: punishment.focal_point_x,
          focal_point_y: punishment.focal_point_y,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Punishment update failed, no data returned.");
      return data as PunishmentData;
    },
    onSuccess: (updatedPunishment) => {
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (oldPunishments = []) => {
        const updatedPunishments = oldPunishments.map(p =>
          p.id === updatedPunishment.id ? updatedPunishment : p
        );
        savePunishmentsToDB(updatedPunishments); // Persist to IndexedDB
        return updatedPunishments;
      });
      toast({ title: "Success", description: "Punishment updated successfully" });
    },
    onError: (error) => {
      console.error('Error updating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to update punishment. Please try again.",
        variant: "destructive",
      });
    }
  });
};
