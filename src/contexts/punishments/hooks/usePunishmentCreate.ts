
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '../types';

interface UsePunishmentCreateProps {
  setPunishments: (callback: (prev: PunishmentData[]) => PunishmentData[]) => void;
}

/**
 * Hook for creating new punishments
 */
export const usePunishmentCreate = ({ setPunishments }: UsePunishmentCreateProps) => {
  
  const createPunishment = async (punishmentData: PunishmentData): Promise<PunishmentData> => {
    try {
      let backgroundImages = punishmentData.background_images;
      if (backgroundImages && Array.isArray(backgroundImages)) {
        backgroundImages = backgroundImages.map(img => 
          img !== null && img !== undefined ? String(img) : null
        );
      }
      
      const dataToSave = {
        ...punishmentData,
        background_images: backgroundImages || null,
        carousel_timer: punishmentData.carousel_timer || 5
      };
      
      const { data, error } = await supabase
        .from('punishments')
        .insert(dataToSave)
        .select()
        .single();
      
      if (error) throw error;
      
      const newPunishment: PunishmentData = {
        ...data,
        background_images: Array.isArray(data.background_images) 
          ? data.background_images.map(img => typeof img === 'string' ? img : null)
          : data.background_images ? [String(data.background_images)] : [],
        carousel_timer: typeof data.carousel_timer === 'number' 
          ? data.carousel_timer 
          : data.carousel_timer !== null && data.carousel_timer !== undefined
            ? Number(data.carousel_timer) 
            : 5
      };
      
      setPunishments(prev => [...prev, newPunishment]);
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
      
      return newPunishment;
    } catch (error) {
      console.error('Error creating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to create punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { createPunishment };
};
