import { useState, useCallback } from 'react';
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
  const [currentCardLoading, setCurrentCardLoading] = useState<boolean>(false);

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

  // Fetch a single punishment by ID
  const fetchPunishmentById = async (id: string): Promise<PunishmentData | null> => {
    try {
      setCurrentCardLoading(true);
      console.log("Fetching punishment with ID:", id);
      
      const { data, error } = await supabase
        .from('punishments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching single punishment:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error in fetchPunishmentById:', err);
      return null;
    } finally {
      setCurrentCardLoading(false);
    }
  };

  // Fetch first punishment (or a specific one if ID is provided)
  const fetchSinglePunishment = async (id?: string) => {
    try {
      setCurrentCardLoading(true);
      
      // Query for first punishment or specific one
      const query = supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);
      
      // If ID is provided, filter by that ID
      const { data, error } = id 
        ? await query.eq('id', id)
        : await query;
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // If we don't already have this punishment, add it
        const exists = punishments.some(p => p.id === data[0].id);
        if (!exists) {
          updatePunishments([...punishments, data[0]]);
        }
        
        console.log("Successfully fetched single punishment:", data[0].title);
      }
    } catch (err) {
      console.error('Error fetching single punishment:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch punishment"));
    } finally {
      setCurrentCardLoading(false);
    }
  };

  // Load the next punishment that isn't already in the punishments array
  const fetchNextPunishment = async () => {
    if (currentCardLoading) return;
    
    try {
      setCurrentCardLoading(true);
      
      // Get IDs of punishments we already have
      const existingIds = punishments.map(p => p.id);
      
      // Query for a punishment we don't already have
      const { data, error } = await supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: true })
        .not('id', 'in', `(${existingIds.join(',')})`)
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        updatePunishments([...punishments, data[0]]);
        console.log("Successfully fetched next punishment:", data[0].title);
        return data[0];
      } else {
        console.log("No more punishments to fetch");
        return null;
      }
    } catch (err) {
      console.error('Error fetching next punishment:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch next punishment"));
      return null;
    } finally {
      setCurrentCardLoading(false);
    }
  };

  const fetchPunishments = async () => {
    // If we already have cached data, don't show loading indicator
    const hasCache = punishments.length > 0;
    
    // Skip fetching if we have valid cached data and no force refresh
    if (hasCache && isCacheValid()) {
      return;
    }
    
    if (!hasCache) {
      setLoading(true);
    }

    try {
      // Instead of loading all, just get the first punishment
      await fetchSinglePunishment();
      
      // Separately fetch punishment history with pagination
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
    currentCardLoading,
    error,
    totalPointsDeducted,
    fetchPunishments,
    fetchSinglePunishment,
    fetchNextPunishment,
    fetchPunishmentById,
    createPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    getPunishmentHistory
  };
};
