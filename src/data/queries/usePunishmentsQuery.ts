
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { loadPunishmentsFromDB, savePunishmentsToDB, loadPunishmentHistoryFromDB, savePunishmentHistoryToDB } from '@/data/indexedDB/useIndexedDB';
import { logQueryPerformance } from '@/lib/react-query-config';
import { useEffect, useState } from 'react';

export const PUNISHMENTS_QUERY_KEY = ['punishments'];
export const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'];

async function fetchPunishments(): Promise<PunishmentData[]> {
  const startTime = performance.now();
  console.log('[PunishmentsQuery] Fetching punishments from the server');
  
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching punishments:', error);
    throw error;
  }
  
  const punishments = data.map(punishment => ({
    id: punishment.id,
    title: punishment.title,
    description: punishment.description,
    points: punishment.points,
    dom_points: punishment.dom_points,
    background_image_url: punishment.background_image_url,
    background_opacity: punishment.background_opacity,
    focal_point_x: punishment.focal_point_x,
    focal_point_y: punishment.focal_point_y,
    icon_name: punishment.icon_name,
    icon_color: punishment.icon_color,
    title_color: punishment.title_color,
    subtext_color: punishment.subtext_color,
    calendar_color: punishment.calendar_color,
    highlight_effect: punishment.highlight_effect,
    background_images: punishment.background_images,
    carousel_timer: punishment.carousel_timer,
    created_at: punishment.created_at,
    updated_at: punishment.updated_at
  } as PunishmentData));
  
  // Save to IndexedDB
  await savePunishmentsToDB(punishments);
  
  logQueryPerformance('PunishmentsQuery', startTime, punishments.length);
  return punishments;
}

async function fetchPunishmentHistory(): Promise<PunishmentHistoryItem[]> {
  const startTime = performance.now();
  console.log('[PunishmentHistoryQuery] Fetching punishment history from the server');
  
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .order('applied_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching punishment history:', error);
    throw error;
  }
  
  const history = data as PunishmentHistoryItem[];
  
  // Save to IndexedDB
  await savePunishmentHistoryToDB(history);
  
  logQueryPerformance('PunishmentHistoryQuery', startTime, history.length);
  return history;
}

export function usePunishmentsQuery() {
  const [initialData, setInitialData] = useState<PunishmentData[] | undefined>(undefined);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  
  // Load initial data from IndexedDB
  useEffect(() => {
    async function loadInitialData() {
      try {
        const cachedPunishments = await loadPunishmentsFromDB();
        setInitialData(cachedPunishments || []);
      } catch (err) {
        console.error('Error loading punishments from IndexedDB:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    
    loadInitialData();
  }, []);
  
  const query = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 1,
    // Only use initialData once it has been loaded from IndexedDB
    initialData: initialData,
    enabled: !isLoadingInitial, // Don't run query until initial loading is done
  });
  
  return {
    ...query,
    // Return cached data while waiting for IndexedDB to load
    data: query.data || initialData || [],
    // Only show loading state if there's no data at all
    isLoading: (query.isLoading || isLoadingInitial) && !initialData?.length
  };
}

export function usePunishmentHistoryQuery() {
  const [initialData, setInitialData] = useState<PunishmentHistoryItem[] | undefined>(undefined);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  
  // Load initial data from IndexedDB
  useEffect(() => {
    async function loadInitialData() {
      try {
        const cachedHistory = await loadPunishmentHistoryFromDB();
        setInitialData(cachedHistory || []);
      } catch (err) {
        console.error('Error loading punishment history from IndexedDB:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    
    loadInitialData();
  }, []);
  
  const query = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchPunishmentHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 1,
    // Only use initialData once it has been loaded from IndexedDB
    initialData: initialData,
    enabled: !isLoadingInitial, // Don't run query until initial loading is done
  });
  
  return {
    ...query,
    // Return cached data while waiting for IndexedDB to load
    data: query.data || initialData || [],
    // Only show loading state if there's no data at all
    isLoading: (query.isLoading || isLoadingInitial) && !initialData?.length
  };
}
