
import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '../types';
import { useLocalSyncedData } from '@/hooks/useLocalSyncedData';

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
  
  // Use the local sync data hook for punishments
  const { 
    data: localPunishments,
    loading: isFetchingPunishments,
    error: punishmentsError,
    refetch: refetchPunishments
  } = useLocalSyncedData<PunishmentData>({
    cacheKey: 'punishments',
    fetchFn: async () => {
      const { data: punishmentsData, error: punishmentsError } = await supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (punishmentsError) throw punishmentsError;
      
      // Process punishments data
      return (punishmentsData || []).map(punishment => {
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
    },
    onError: (error) => {
      console.error('Error fetching punishments:', error);
      setError(error);
    }
  });
  
  // Use the local sync data hook for punishment history
  const {
    data: localPunishmentHistory,
    loading: isFetchingHistory,
    error: historyError,
    refetch: refetchHistory
  } = useLocalSyncedData<PunishmentHistoryItem>({
    cacheKey: 'punishment_history',
    fetchFn: async () => {
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .limit(50);
      
      if (historyError) throw historyError;
      
      return historyData || [];
    },
    onError: (error) => {
      console.error('Error fetching punishment history:', error);
      // Don't set global error for history errors - it's not critical
    }
  });
  
  // Update state whenever local data changes
  useEffect(() => {
    if (localPunishments) {
      setPunishments(localPunishments);
    }
    
    if (localPunishmentHistory) {
      setPunishmentHistory(localPunishmentHistory);
      
      // Calculate total points deducted
      const totalDeducted = localPunishmentHistory.reduce(
        (sum, item) => sum + item.points_deducted, 
        0
      );
      setTotalPointsDeducted(totalDeducted);
    }
    
    // Update loading state based on both data fetches
    setLoading(isFetchingPunishments || isFetchingHistory);
    
    // Set error state (prioritize punishments error over history error)
    if (punishmentsError) {
      setError(punishmentsError);
    } else if (historyError) {
      setError(historyError);
    } else {
      setError(null);
    }
  }, [
    localPunishments, 
    localPunishmentHistory, 
    isFetchingPunishments, 
    isFetchingHistory,
    punishmentsError,
    historyError,
    setPunishments,
    setPunishmentHistory,
    setLoading,
    setError,
    setTotalPointsDeducted
  ]);

  const fetchPunishments = async () => {
    await Promise.all([
      refetchPunishments(),
      refetchHistory()
    ]);
  };

  return { fetchPunishments };
};
