
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '../types';

interface UsePunishmentFetchProps {
  setPunishments: (punishments: PunishmentData[]) => void;
  setPunishmentHistory: (history: PunishmentHistoryItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setTotalPointsDeducted: (total: number) => void;
}

/**
 * Hook for fetching punishments data from Supabase
 */
export const usePunishmentFetch = ({
  setPunishments,
  setPunishmentHistory,
  setLoading,
  setError,
  setTotalPointsDeducted
}: UsePunishmentFetchProps) => {
  
  const fetchPunishments = async () => {
    try {
      setLoading(true);
      
      const { data: punishmentsData, error: punishmentsError } = await supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (punishmentsError) throw punishmentsError;
      
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false });
      
      if (historyError) throw historyError;
      
      const transformedPunishments: PunishmentData[] = punishmentsData?.map(punishment => {
        let backgroundImages: (string | null)[] = [];
        if (punishment.background_images) {
          if (Array.isArray(punishment.background_images)) {
            backgroundImages = punishment.background_images
              .filter(img => img !== null && img !== undefined)
              .map(img => typeof img === 'string' ? img : null);
          } else if (typeof punishment.background_images === 'string') {
            backgroundImages = [punishment.background_images];
          }
        }
        
        return {
          ...punishment,
          background_images: backgroundImages,
          carousel_timer: typeof punishment.carousel_timer === 'number' 
            ? punishment.carousel_timer 
            : punishment.carousel_timer !== null && punishment.carousel_timer !== undefined
              ? Number(punishment.carousel_timer) 
              : 5
        };
      }) || [];
      
      setPunishments(transformedPunishments);
      setPunishmentHistory(historyData || []);
      
      const totalDeducted = (historyData || []).reduce((sum, item) => sum + item.points_deducted, 0);
      setTotalPointsDeducted(totalDeducted);
      
    } catch (error) {
      console.error('Error fetching punishments:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch punishments'));
      toast({
        title: "Error",
        description: "Failed to load punishments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { fetchPunishments };
};
