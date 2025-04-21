
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '../types';

// Define query key
const PUNISHMENTS_QUERY_KEY = 'punishments';

// Function to fetch punishments from Supabase
const fetchPunishmentsFromSupabase = async (): Promise<PunishmentData[]> => {
  try {
    let allPunishments: PunishmentData[] = [];
    const BATCH_SIZE = 12;
    const MAX_BATCHES = 20; // up to 240 items

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

      allPunishments = [...allPunishments, ...cleanedBatch];

      // Small delay to avoid hitting rate limits if many batches are needed
      // await new Promise(res => setTimeout(res, 100)); // Consider if needed
    }

    return allPunishments;

  } catch (err: any) {
    console.error('Error fetching punishments:', err);
    toast({
      title: "Error",
      description: "Failed to load punishments. Please check your connection and try again.",
      variant: "destructive",
    });
    // Re-throw the error so TanStack Query can handle it
    throw err instanceof Error ? err : new Error('Failed to fetch punishments');
  }
};

/**
 * Hook for fetching punishments data using TanStack Query.
 */
export const useFetchPunishments = () => {
  return useQuery<PunishmentData[], Error>({
    queryKey: [PUNISHMENTS_QUERY_KEY],
    queryFn: fetchPunishmentsFromSupabase,
    // staleTime and cacheTime (gcTime) are set globally in QueryClient defaults
  });
};

// ---- History Fetching (Keep separate for now, might combine later if needed) ----

const PUNISHMENT_HISTORY_QUERY_KEY = 'punishmentHistory';

const fetchPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  try {
    const { data: historyData, error: historyError } = await supabase
      .from('punishment_history')
      .select('*')
      .order('applied_date', { ascending: false })
      .range(0, 49); // Fetch latest 50 history items

    if (historyError) throw historyError;

    return historyData || [];

  } catch (err: any) {
    console.error('Error fetching punishment history:', err);
    toast({
      title: "Error",
      description: "Failed to load punishment history.",
      variant: "destructive",
    });
    throw err instanceof Error ? err : new Error('Failed to fetch punishment history');
  }
};

export const useFetchPunishmentHistory = () => {
  return useQuery<PunishmentHistoryItem[], Error>({
    queryKey: [PUNISHMENT_HISTORY_QUERY_KEY],
    queryFn: fetchPunishmentHistory,
  });
};

// Hook to calculate total points deducted from history
export const useTotalPunishmentPointsDeducted = () => {
  const { data: historyData, isLoading, error } = useFetchPunishmentHistory();

  const totalPointsDeducted = React.useMemo(() => {
    if (!historyData) return 0;
    return historyData.reduce((sum, item) => sum + (item.points_deducted || 0), 0);
  }, [historyData]);

  return { totalPointsDeducted, isLoading, error };
};

