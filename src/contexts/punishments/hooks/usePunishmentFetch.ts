
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
  
  const BATCH_SIZE = 12;
  const MAX_BATCHES = 20; // total of 240 max punishments, adjust if needed
  
  const fetchPunishments = async () => {
    try {
      setLoading(true);
      let allPunishments: PunishmentData[] = [];
      
      for (let i = 0; i < MAX_BATCHES; i++) {
        const start = i * BATCH_SIZE;
        const end = start + BATCH_SIZE - 1;
        
        const { data: batch, error } = await supabase
          .from('punishments')
          .select('*')
          .order('created_at', { ascending: true })
          .range(start, end);
        
        if (error) throw error;
        if (!batch || batch.length === 0) break;
        
        const cleanedBatch = batch.map(punishment => {
          let backgroundImages: (string | null)[] = [];
          if (punishment.background_images) {
            if (Array.isArray(punishment.background_images)) {
              backgroundImages = punishment.background_images.filter(img => img !== null && img !== undefined);
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
        });
        
        allPunishments = [...allPunishments, ...cleanedBatch];
        
        // Delay slightly to avoid overwhelming client/browser
        await new Promise(res => setTimeout(res, 100));
      }
      
      setPunishments(allPunishments);
      
      // Fetch limited punishment history
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .range(0, 49); // load up to 50 history records
      
      if (historyError) throw historyError;
      
      setPunishmentHistory(historyData || []);
      
      const totalDeducted = (historyData || []).reduce((sum, item) => sum + item.points_deducted, 0);
      setTotalPointsDeducted(totalDeducted);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching punishments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch punishments'));
      toast({
        title: "Error",
        description: "Failed to load punishments. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return { fetchPunishments };
};
