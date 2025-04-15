
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
  
  // Reduced batch size to prevent timeouts
  const BATCH_SIZE = 6;
  const MAX_BATCHES = 2; // Limit to just 12 items total initially
  
  const fetchPunishments = async () => {
    try {
      setLoading(true);
      
      // First, get just the most recent punishments (optimized query)
      const { data: recentPunishments, error: recentError } = await supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);
      
      if (recentError) throw recentError;
      
      // Process punishments data
      const cleanedPunishments = (recentPunishments || []).map(punishment => {
        let backgroundImages: string[] = [];
        
        if (punishment.background_images) {
          if (Array.isArray(punishment.background_images)) {
            backgroundImages = punishment.background_images
              .filter((img): img is string => typeof img === 'string' && !!img);
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
      
      setPunishments(cleanedPunishments);
      
      // Get a small sample of history data
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .limit(20);
      
      if (historyError) throw historyError;
      
      setPunishmentHistory(historyData || []);
      
      const totalDeducted = (historyData || []).reduce((sum, item) => sum + item.points_deducted, 0);
      setTotalPointsDeducted(totalDeducted);
      
      setLoading(false);
      
      // Optionally load more data in the background after initial display
      loadAdditionalDataInBackground();
      
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
  
  // Load additional data without blocking the UI
  const loadAdditionalDataInBackground = async () => {
    try {
      // Get more history data if needed
      const { data: moreHistoryData, error: moreHistoryError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .range(20, 49);
      
      if (!moreHistoryError && moreHistoryData && moreHistoryData.length > 0) {
        setPunishmentHistory(prev => [...prev, ...moreHistoryData]);
        
        const totalDeducted = [...moreHistoryData].reduce((sum, item) => sum + item.points_deducted, 0);
        setTotalPointsDeducted(prev => prev + totalDeducted);
      }
    } catch (error) {
      console.warn('Background data loading encountered an issue:', error);
      // Don't show error to user since this is background loading
    }
  };

  return { fetchPunishments };
};
