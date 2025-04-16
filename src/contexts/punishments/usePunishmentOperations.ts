
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from './types';

// Reduced cache time to prevent quota issues
const CACHE_KEY = "punishments_cache";
const HISTORY_CACHE_KEY = "punishment_history_cache";
const TOTAL_POINTS_CACHE_KEY = "punishment_total_points";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache expiry

export const usePunishmentOperations = () => {
  // Get cache expiry timestamp
  const getCacheExpiry = () => {
    try {
      return parseInt(localStorage.getItem(CACHE_KEY + "_expiry") || "0", 10);
    } catch (e) {
      return 0;
    }
  };

  // Check if cache is still valid
  const isCacheValid = () => {
    return Date.now() < getCacheExpiry();
  };

  // Initialize punishments from cache if available and valid
  const [punishments, setPunishments] = useState<PunishmentData[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached && isCacheValid()) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
      console.error("Error loading cached punishments:", e);
    }
    return [];
  });

  // Initialize punishment history from cache if available
  const [punishmentHistory, setPunishmentHistory] = useState<PunishmentHistoryItem[]>(() => {
    try {
      const cached = localStorage.getItem(HISTORY_CACHE_KEY);
      if (cached && isCacheValid()) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      localStorage.removeItem(HISTORY_CACHE_KEY);
      console.error("Error loading cached punishment history:", e);
    }
    return [];
  });

  // Initialize total points from cache if available
  const [totalPointsDeducted, setTotalPointsDeducted] = useState<number>(() => {
    try {
      const cached = localStorage.getItem(TOTAL_POINTS_CACHE_KEY);
      if (cached && isCacheValid()) {
        const parsed = parseInt(cached, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {
      localStorage.removeItem(TOTAL_POINTS_CACHE_KEY);
      console.error("Error loading cached total points:", e);
    }
    return 0;
  });

  const [loading, setLoading] = useState<boolean>(punishments.length === 0);
  const [error, setError] = useState<Error | null>(null);
  const fetchingInProgressRef = useRef(false);

  // Update local storage with throttling to prevent quota errors
  const updatePunishments = useCallback((newPunishments: PunishmentData[]) => {
    setPunishments(newPunishments);
    try {
      const cacheString = JSON.stringify(newPunishments);
      if (cacheString.length < 500000) { // Only cache if data is reasonable size
        localStorage.setItem(CACHE_KEY, cacheString);
        localStorage.setItem(CACHE_KEY + "_expiry", (Date.now() + CACHE_EXPIRY_MS).toString());
      }
    } catch (e) {
      console.error("Error caching punishments:", e);
    }
  }, []);

  // Update local storage when history changes, with size limits
  const updatePunishmentHistory = useCallback((newHistory: PunishmentHistoryItem[] | ((prev: PunishmentHistoryItem[]) => PunishmentHistoryItem[])) => {
    setPunishmentHistory(prev => {
      const updatedHistory = typeof newHistory === 'function' ? newHistory(prev) : newHistory;
      try {
        // Only cache the most recent 30 history items to prevent quota issues
        const historyToCache = updatedHistory.slice(0, 30);
        localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(historyToCache));
        localStorage.setItem(HISTORY_CACHE_KEY + "_expiry", (Date.now() + CACHE_EXPIRY_MS).toString());
      } catch (e) {
        console.error("Error caching punishment history:", e);
      }
      return updatedHistory;
    });
  }, []);

  // Update local storage when total points change
  const updateTotalPointsDeducted = useCallback((newTotal: number | ((prev: number) => number)) => {
    setTotalPointsDeducted(prev => {
      const updatedTotal = typeof newTotal === 'function' ? newTotal(prev) : newTotal;
      try {
        localStorage.setItem(TOTAL_POINTS_CACHE_KEY, updatedTotal.toString());
        localStorage.setItem(TOTAL_POINTS_CACHE_KEY + "_expiry", (Date.now() + CACHE_EXPIRY_MS).toString());
      } catch (e) {
        console.error("Error caching total points:", e);
      }
      return updatedTotal;
    });
  }, []);

  const fetchPunishmentsBatch = async (offset: number, limit: number): Promise<PunishmentData[]> => {
    const { data, error } = await supabase
      .from('punishments')
      .select('*')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
      .abortSignal(AbortSignal.timeout(5000));

    if (error) throw error;
    return data || [];
  };

  const fetchPunishments = async () => {
    // If we already have cached data, don't show loading indicator
    const hasCache = punishments.length > 0;
    
    // Skip fetching if we have valid cached data and no force refresh
    if (hasCache && isCacheValid()) {
      return;
    }
    
    // Prevent concurrent fetches
    if (fetchingInProgressRef.current) {
      console.log('Fetching already in progress, skipping duplicate request');
      return;
    }
    
    fetchingInProgressRef.current = true;
    
    if (!hasCache) {
      setLoading(true);
    }

    try {
      // Clear existing punishments if we're doing a full refresh
      if (!hasCache) {
        updatePunishments([]);
      }
      
      // Fetch punishments one by one with a small batch size to avoid timeouts
      const batchSize = 1; // Fetch one at a time
      let offset = 0;
      let hasMore = true;
      const allPunishments: PunishmentData[] = [...punishments];
      
      while (hasMore) {
        const batch = await fetchPunishmentsBatch(offset, batchSize);
        
        if (batch.length > 0) {
          // Add the new batch and update state incrementally
          allPunishments.push(...batch);
          updatePunishments([...allPunishments]);
          offset += batch.length;
        } else {
          hasMore = false;
        }
        
        // Add a small delay to avoid overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Separately fetch punishment history
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false })
        .limit(30); // Limit to recent history
      
      if (historyError) throw historyError;
      
      if (historyData) {
        updatePunishmentHistory(historyData);
        
        // Calculate total points deducted
        const totalDeducted = historyData.reduce(
          (sum: number, item: PunishmentHistoryItem) => sum + item.points_deducted, 0
        );
        updateTotalPointsDeducted(totalDeducted);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching punishments:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch punishments"));
      
      // Only show toast if we don't have cached data
      if (!hasCache) {
        toast({
          title: "Connection Error",
          description: "Could not load punishments from server. Using cached data if available.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      fetchingInProgressRef.current = false;
    }
  };

  // CRUD operations with optimistic updates 
  const createPunishment = async (punishmentData: PunishmentData): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('punishments')
        .insert(punishmentData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the local state with the new punishment
      updatePunishments([...punishments, data]);
      
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
      
      return data.id;
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

  const updatePunishment = async (id: string, punishmentData: PunishmentData): Promise<void> => {
    try {
      const { id: _, ...dataToUpdate } = punishmentData;
      
      // Optimistically update local state
      const updatedPunishments = punishments.map(punishment => 
        punishment.id === id ? { ...punishment, ...dataToUpdate } : punishment
      );
      updatePunishments(updatedPunishments);
      
      const { error } = await supabase
        .from('punishments')
        .update(dataToUpdate)
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
    } catch (error) {
      console.error('Error updating punishment:', error);
      
      // Revert to original data on error
      fetchPunishments();
      
      toast({
        title: "Error",
        description: "Failed to update punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePunishment = async (id: string): Promise<void> => {
    try {
      // Optimistically update local state
      const filteredPunishments = punishments.filter(punishment => punishment.id !== id);
      updatePunishments(filteredPunishments);
      
      const filteredHistory = punishmentHistory.filter(item => item.punishment_id !== id);
      updatePunishmentHistory(filteredHistory);
      
      // Recalculate total points
      const newTotal = filteredHistory.reduce((sum, item) => sum + item.points_deducted, 0);
      updateTotalPointsDeducted(newTotal);
      
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting punishment:', error);
      
      // Revert to original data on error
      fetchPunishments();
      
      toast({
        title: "Error",
        description: "Failed to delete punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const applyPunishment = async (punishmentId: string, points: number): Promise<void> => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      const historyEntry = {
        punishment_id: punishmentId,
        day_of_week: dayOfWeek,
        points_deducted: points
      };
      
      // Optimistically update local state
      updateTotalPointsDeducted(prev => prev + points);
      
      const { data, error } = await supabase
        .from('punishment_history')
        .insert(historyEntry)
        .select()
        .single();
      
      if (error) throw error;
      
      updatePunishmentHistory(prev => [data, ...prev]);
      
      toast({
        title: "Punishment Applied",
        description: `${points} points deducted.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error applying punishment:', error);
      
      // Revert total points on error
      fetchPunishments();
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  return {
    punishments,
    punishmentHistory,
    loading,
    error,
    totalPointsDeducted,
    fetchPunishments,
    createPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    getPunishmentHistory
  };
};
