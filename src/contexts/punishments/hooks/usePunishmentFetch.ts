
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

const CACHE_VERSION = '1.0';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const PUNISHMENT_CACHE_KEY = 'punishments_cache';
const HISTORY_CACHE_KEY = 'punishment_history_cache';
const TOTAL_POINTS_CACHE_KEY = 'punishment_total_points_cache';

/**
 * Hook for fetching punishments data from Supabase with optimized caching
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
      
      // Try to load punishments from cache first
      const cachedPunishments = loadFromCache<PunishmentData[]>(PUNISHMENT_CACHE_KEY);
      if (cachedPunishments) {
        console.log('Loaded punishments from cache');
        setPunishments(cachedPunishments);
        
        // Load history from cache too if available
        const cachedHistory = loadFromCache<PunishmentHistoryItem[]>(HISTORY_CACHE_KEY);
        if (cachedHistory) {
          console.log('Loaded punishment history from cache');
          setPunishmentHistory(cachedHistory);
          
          // Load total points from cache
          const cachedTotalPoints = loadFromCache<number>(TOTAL_POINTS_CACHE_KEY);
          if (cachedTotalPoints !== null) {
            setTotalPointsDeducted(cachedTotalPoints);
          }
          
          // We still have loading = true here as we're fetching fresh data in the background
        }
      }
      
      // Fetch fresh data from Supabase (even if we loaded from cache)
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
      
      // Update state with fresh data
      setPunishments(cleanedPunishments);
      
      // Cache the fresh punishments data
      saveToCache(PUNISHMENT_CACHE_KEY, cleanedPunishments);
      
      // Get history data
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .limit(20);
      
      if (historyError) throw historyError;
      
      // Update state with fresh history data
      setPunishmentHistory(historyData || []);
      
      // Cache the fresh history data
      saveToCache(HISTORY_CACHE_KEY, historyData || []);
      
      const totalDeducted = (historyData || []).reduce((sum, item) => sum + item.points_deducted, 0);
      setTotalPointsDeducted(totalDeducted);
      
      // Cache the total points
      saveToCache(TOTAL_POINTS_CACHE_KEY, totalDeducted);
      
      setLoading(false);
      
      // Optionally load more data in the background after initial display
      loadAdditionalDataInBackground();
      
    } catch (err: any) {
      console.error('Error fetching punishments:', err);
      
      // Only show error toast if we don't have cached data
      const hasCachedData = loadFromCache<PunishmentData[]>(PUNISHMENT_CACHE_KEY) !== null;
      
      if (!hasCachedData) {
        setError(err instanceof Error ? err : new Error('Failed to fetch punishments'));
        toast({
          title: "Error",
          description: "Failed to load punishments. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Using cached data as fallback due to fetch error');
      }
      
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
        setPunishmentHistory((prev: PunishmentHistoryItem[]) => {
          const combined = [...prev, ...moreHistoryData];
          
          // Update the cache with the combined data
          saveToCache(HISTORY_CACHE_KEY, combined);
          
          return combined;
        });
        
        const totalDeducted = moreHistoryData.reduce((sum, item) => sum + item.points_deducted, 0);
        setTotalPointsDeducted((prev: number) => {
          const newTotal = prev + totalDeducted;
          
          // Update the cache with the new total
          saveToCache(TOTAL_POINTS_CACHE_KEY, newTotal);
          
          return newTotal;
        });
      }
    } catch (error) {
      console.warn('Background data loading encountered an issue:', error);
      // Don't show error to user since this is background loading
    }
  };

  return { fetchPunishments };
};

// Cache utility functions

interface CacheItem<T> {
  version: string;
  timestamp: number;
  data: T;
}

const saveToCache = <T>(key: string, data: T): void => {
  try {
    const cacheItem: CacheItem<T> = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data
    };
    
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error(`Failed to save to cache (${key}):`, error);
    // Attempt to clear this cache entry if saving fails
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore if this also fails
    }
  }
};

const loadFromCache = <T>(key: string): T | null => {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;
    
    const cacheItem = JSON.parse(cachedData) as CacheItem<T>;
    
    // Check version and expiry
    if (cacheItem.version !== CACHE_VERSION) {
      console.log(`Cache version mismatch for ${key}, clearing`);
      localStorage.removeItem(key);
      return null;
    }
    
    if (Date.now() - cacheItem.timestamp > CACHE_EXPIRY) {
      console.log(`Cache expired for ${key}, clearing`);
      localStorage.removeItem(key);
      return null;
    }
    
    return cacheItem.data;
  } catch (error) {
    console.error(`Failed to load from cache (${key}):`, error);
    // Clear this cache entry if loading fails
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore if this also fails
    }
    return null;
  }
};
