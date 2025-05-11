
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from "@/contexts/punishments/types";
import { loadPunishmentsFromDB, savePunishmentsToDB, loadPunishmentHistoryFromDB, savePunishmentHistoryToDB } from "../indexedDB/useIndexedDB";
import { startOfWeek, format } from 'date-fns';

// Fetch punishments from Supabase
const fetchPunishments = async (): Promise<PunishmentData[]> => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // Save to IndexedDB for offline access
  await savePunishmentsToDB(data || []);
  
  return data || [];
};

// Fetch punishment history for the current week
const fetchPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const startDate = format(startOfCurrentWeek, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .gte('applied_date', startDate)
    .lte('applied_date', format(today, 'yyyy-MM-dd'))
    .order('applied_date', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // Save to IndexedDB for offline access
  await savePunishmentHistoryToDB(data || []);
  
  return data || [];
};

// Functions to load cached data for placeholderData
const loadCachedPunishments = async (): Promise<PunishmentData[]> => {
  try {
    const cachedPunishments = await loadPunishmentsFromDB();
    return cachedPunishments || [];
  } catch (error) {
    console.error("Error loading cached punishments:", error);
    return [];
  }
};

const loadCachedPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  try {
    const cachedHistory = await loadPunishmentHistoryFromDB();
    return cachedHistory || [];
  } catch (error) {
    console.error("Error loading cached punishment history:", error);
    return [];
  }
};

// Hook for accessing punishments
export function usePunishments() {
  const punishmentsQuery = useQuery({
    queryKey: ['punishments'],
    queryFn: fetchPunishments,
    initialData: [], // Direct array instead of function
    staleTime: Infinity,
    placeholderData: () => {
      // Return empty array as placeholder until the real data loads
      return [];
    },
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  const historyQuery = useQuery({
    queryKey: ['punishment_history'],
    queryFn: fetchPunishmentHistory,
    initialData: [], // Direct array instead of function
    staleTime: Infinity,
    placeholderData: () => {
      // Return empty array as placeholder until the real data loads
      return [];
    },
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  return {
    punishments: punishmentsQuery.data || [],
    punishmentHistory: historyQuery.data || [],
    isLoading: punishmentsQuery.isLoading,
    historyLoading: historyQuery.isLoading,
    error: punishmentsQuery.error,
    refetchPunishments: punishmentsQuery.refetch,
    refetchHistory: historyQuery.refetch,
  };
}
