
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
  
  // Transform the data to ensure it matches the PunishmentData interface
  const transformedPunishments: PunishmentData[] = (data || []).map(punishment => ({
    id: punishment.id,
    title: punishment.title,
    description: punishment.description || "",
    points: punishment.points,
    dom_points: punishment.dom_points || 0,
    background_image_url: punishment.background_image_url,
    background_opacity: punishment.background_opacity || 50,
    focal_point_x: punishment.focal_point_x || 50,
    focal_point_y: punishment.focal_point_y || 50,
    highlight_effect: punishment.highlight_effect || false,
    icon_name: punishment.icon_name,
    icon_color: punishment.icon_color || "#ea384c",
    subtext_color: punishment.subtext_color || "#8E9196",
    calendar_color: punishment.calendar_color || "#ea384c",
    title_color: punishment.title_color || "#FFFFFF",
    created_at: punishment.created_at || new Date().toISOString(),
    updated_at: punishment.updated_at || new Date().toISOString(),
  }));
  
  // Save to IndexedDB for offline access
  await savePunishmentsToDB(transformedPunishments);
  
  return transformedPunishments;
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
  
  // Transform and validate the punishment history data
  const transformedHistory: PunishmentHistoryItem[] = (data || []).map(item => ({
    id: item.id,
    punishment_id: item.punishment_id || "",
    applied_date: item.applied_date || new Date().toISOString(),
    day_of_week: item.day_of_week,
    points_deducted: item.points_deducted
  }));
  
  // Save to IndexedDB for offline access
  await savePunishmentHistoryToDB(transformedHistory);
  
  return transformedHistory;
};

// Hook for accessing punishments
export function usePunishments() {
  const punishmentsQuery = useQuery({
    queryKey: ['punishments'],
    queryFn: fetchPunishments,
    initialData: [], 
    staleTime: Infinity,
    placeholderData: () => {
      // Return empty array as placeholder
      return [];
    },
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  const historyQuery = useQuery({
    queryKey: ['punishment_history'],
    queryFn: fetchPunishmentHistory,
    initialData: [], 
    staleTime: Infinity,
    placeholderData: () => {
      // Return empty array as placeholder
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
