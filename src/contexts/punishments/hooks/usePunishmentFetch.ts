import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '../types';

interface UsePunishmentFetchProps {
  setPunishments: (punishments: PunishmentData[]) => void;
  setPunishmentHistory: (history: PunishmentHistoryItem[] | ((prev: PunishmentHistoryItem[]) => PunishmentHistoryItem[])) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setTotalPointsDeducted: (total: number | ((prev: number) => number)) => void;
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
  
  // Optimize for faster initial load - show 12 items immediately
  const INITIAL_BATCH_SIZE = 12;
  
  const fetchPunishments = async () => {
    try {
      setLoading(true);
      
      // First, get initial punishments (12 most recent)
      const { data: recentPunishments, error: recentError } = await supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(INITIAL_BATCH_SIZE);
      
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
      
      // Get initial history data - keep small for fast loading
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .limit(15); // Reduced from 20 to load faster
      
      if (historyError) throw historyError;
      
      setPunishmentHistory(historyData || []);
      
      const totalDeducted = (historyData || []).reduce((sum, item) => sum + item.points_deducted, 0);
      setTotalPointsDeducted(totalDeducted);
      
      // Show content immediately
      setLoading(false);
      
      // Then load more data in the background with a delay to prevent database overload
      setTimeout(() => {
        loadAdditionalDataInBackground();
      }, 2000); // 2 second delay to let the UI stabilize
      
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
      console.log("Starting background data load");
      
      // Get more history data in background
      const { data: moreHistoryData, error: moreHistoryError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .range(15, 30); // Get the next 15 records
      
      if (!moreHistoryError && moreHistoryData && moreHistoryData.length > 0) {
        console.log(`Loaded ${moreHistoryData.length} additional history items in background`);
        
        setPunishmentHistory((prev: PunishmentHistoryItem[]) => {
          // Avoid duplicates by checking IDs
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = moreHistoryData.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
        
        const totalDeducted = moreHistoryData.reduce((sum, item) => sum + item.points_deducted, 0);
        setTotalPointsDeducted((prev: number) => prev + totalDeducted);
      } else {
        console.log("No additional history items to load or reached the end");
      }
    } catch (error) {
      console.warn('Background data loading encountered an issue:', error);
      // Don't show error to user since this is background loading
    }
  };

  return { fetchPunishments };
};
