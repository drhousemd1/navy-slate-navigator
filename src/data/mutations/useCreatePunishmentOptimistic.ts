
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';
import { queryClient } from '@/data/queryClient';
import { toast } from '@/hooks/use-toast';

export const useCreatePunishmentOptimistic = () => {
  return useMutation({
    mutationFn: async (punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
      const { data, error } = await supabase
        .from('punishments')
        .insert({
          title: punishmentData.title,
          description: punishmentData.description,
          points: punishmentData.points || 10,
          icon_name: punishmentData.icon_name,
          icon_color: punishmentData.icon_color || '#ea384c',
          background_image_url: punishmentData.background_image_url,
          background_opacity: punishmentData.background_opacity || 50,
          title_color: punishmentData.title_color || '#FFFFFF',
          subtext_color: punishmentData.subtext_color || '#8E9196',
          calendar_color: punishmentData.calendar_color || '#ea384c',
          highlight_effect: punishmentData.highlight_effect || false,
          focal_point_x: punishmentData.focal_point_x || 50,
          focal_point_y: punishmentData.focal_point_y || 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Punishment creation failed, no data returned.");
      return data as PunishmentData;
    },
    onSuccess: (newPunishment) => {
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (oldPunishments = []) => {
        const updatedPunishments = [newPunishment, ...oldPunishments];
        savePunishmentsToDB(updatedPunishments); // Persist to IndexedDB
        return updatedPunishments;
      });
      toast({ title: "Success", description: "Punishment created successfully" });
    },
    onError: (error) => {
      console.error('Error creating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to create punishment. Please try again.",
        variant: "destructive",
      });
    }
  });
};
